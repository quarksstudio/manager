#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/landlock.h>
#include <linux/seccomp.h>
#include <sched.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <unistd.h>

/* Install restrictions in this single-threaded launcher, before Node creates
   libuv or GC threads. Every descendant inherits both kernel policies. */
static void fail(const char *what) { perror(what); exit(126); }
static void allow(int rules, const char *file, uint64_t access, int optional) {
  int fd = open(file, O_PATH | O_CLOEXEC);
  if (fd < 0) { if (optional && errno == ENOENT) return; fail(file); }
  struct landlock_path_beneath_attr rule = { .allowed_access = access, .parent_fd = fd };
  if (syscall(SYS_landlock_add_rule, rules, LANDLOCK_RULE_PATH_BENEATH, &rule, 0)) fail("landlock rule");
  close(fd);
}
#define DENY(n) BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, (n), 0, 1), BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO|EPERM)
int main(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "usage: host NODE SNAPSHOT ENTRY [ARGS]\n"); return 126; }
  int abi = syscall(SYS_landlock_create_ruleset, NULL, 0, LANDLOCK_CREATE_RULESET_VERSION);
  if (abi < 3) { fprintf(stderr, "Landlock ABI >= 3 is required\n"); return 126; }
  const uint64_t read = LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_READ_DIR;
  struct landlock_ruleset_attr attr = { .handled_access_fs =
    LANDLOCK_ACCESS_FS_EXECUTE | LANDLOCK_ACCESS_FS_WRITE_FILE | read |
    LANDLOCK_ACCESS_FS_REMOVE_DIR | LANDLOCK_ACCESS_FS_REMOVE_FILE |
    LANDLOCK_ACCESS_FS_MAKE_CHAR | LANDLOCK_ACCESS_FS_MAKE_DIR |
    LANDLOCK_ACCESS_FS_MAKE_REG | LANDLOCK_ACCESS_FS_MAKE_SOCK |
    LANDLOCK_ACCESS_FS_MAKE_FIFO | LANDLOCK_ACCESS_FS_MAKE_BLOCK |
    LANDLOCK_ACCESS_FS_MAKE_SYM | LANDLOCK_ACCESS_FS_REFER | LANDLOCK_ACCESS_FS_TRUNCATE };
  int rules = syscall(SYS_landlock_create_ruleset, &attr, sizeof(attr), 0);
  if (rules < 0) fail("landlock create");
  allow(rules, argv[1], LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_EXECUTE, 0);
  allow(rules, argv[2], read, 0);
  allow(rules, "/lib", read, 1); allow(rules, "/lib64", read, 1);
  allow(rules, "/usr/lib", read, 1); allow(rules, "/usr/lib64", read, 1);
  allow(rules, "/lib64/ld-linux-x86-64.so.2", LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_EXECUTE, 1);
  allow(rules, "/lib/ld-linux-aarch64.so.1", LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_EXECUTE, 1);
  allow(rules, "/dev/null", LANDLOCK_ACCESS_FS_READ_FILE, 0);
  allow(rules, "/etc/ld.so.cache", LANDLOCK_ACCESS_FS_READ_FILE, 1);
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) fail("no new privileges");
  if (syscall(SYS_landlock_restrict_self, rules, 0)) fail("landlock restrict");
  close(rules);
#if defined(__x86_64__)
#define HOST_ARCH AUDIT_ARCH_X86_64
#elif defined(__aarch64__)
#define HOST_ARCH AUDIT_ARCH_AARCH64
#else
#error unsupported architecture
#endif
  struct sock_filter filter[] = {
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data, arch)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, HOST_ARCH, 1, 0),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_KILL_PROCESS),
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data, nr)),
#ifdef __x86_64__
    BPF_JUMP(BPF_JMP|BPF_JGE|BPF_K, 0x40000000, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_KILL_PROCESS),
#endif
    DENY(SYS_socket), DENY(SYS_socketpair), DENY(SYS_ptrace),
    /* Landlock does not mediate metadata mutations. Deny them explicitly. */
    DENY(SYS_chmod), DENY(SYS_fchmod), DENY(SYS_fchmodat),
    DENY(SYS_chown), DENY(SYS_fchown), DENY(SYS_lchown), DENY(SYS_fchownat),
    DENY(SYS_utimensat), DENY(SYS_setxattr), DENY(SYS_lsetxattr), DENY(SYS_fsetxattr),
    DENY(SYS_removexattr), DENY(SYS_lremovexattr), DENY(SYS_fremovexattr),
#ifdef SYS_fchmodat2
    DENY(SYS_fchmodat2),
#endif
#ifdef SYS_utime
    DENY(SYS_utime),
#endif
#ifdef SYS_utimes
    DENY(SYS_utimes),
#endif
    DENY(SYS_io_uring_setup), DENY(SYS_bpf), DENY(SYS_perf_event_open),
    DENY(SYS_prlimit64), DENY(SYS_setpriority),
#ifdef SYS_setrlimit
    DENY(SYS_setrlimit),
#endif


    DENY(SYS_process_vm_readv), DENY(SYS_process_vm_writev),
    DENY(SYS_unshare), DENY(SYS_setns), DENY(SYS_kill),
#ifdef SYS_tkill
    DENY(SYS_tkill),
#endif
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, SYS_tgkill, 0, 4),
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data, args[0])),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, getpid(), 1, 0),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO|EPERM),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ALLOW),
#ifdef SYS_fork
    DENY(SYS_fork),
#endif
#ifdef SYS_vfork
    DENY(SYS_vfork),
#endif
#ifdef SYS_pidfd_send_signal
    DENY(SYS_pidfd_send_signal),
#endif
#ifdef SYS_clone3
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, SYS_clone3, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO|ENOSYS),
#endif
    /* Only threads sharing the current process are allowed. */
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, SYS_clone, 0, 4),
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data, args[0])),
    BPF_JUMP(BPF_JMP|BPF_JSET|BPF_K, CLONE_THREAD, 1, 0),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO|EPERM),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ALLOW),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ALLOW),
  };
  struct sock_fprog program = { .len = sizeof(filter)/sizeof(filter[0]), .filter = filter };
  struct rlimit cpu = {30, 30}; if (setrlimit(RLIMIT_CPU, &cpu)) fail("cpu limit");
  struct rlimit files = {64, 64}; if (setrlimit(RLIMIT_NOFILE, &files)) fail("file limit");
  struct rlimit address = {2ULL * 1024 * 1024 * 1024, 2ULL * 1024 * 1024 * 1024};
  if (setrlimit(RLIMIT_AS, &address)) fail("address space limit");
  if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &program)) fail("seccomp");
  if (chdir(argv[2])) fail("snapshot cwd");
  char **node = calloc(argc + 3, sizeof(char *));
  if (!node) fail("allocation");
  node[0] = argv[1]; node[1] = "--max-old-space-size=128"; node[2] = "--openssl-config=/dev/null";
  for (int i = 3; i < argc; i++) node[i] = argv[i];
  execv(node[0], node); fail("node exec");
}
