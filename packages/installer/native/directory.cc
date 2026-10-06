#include <node_api.h>
#include <algorithm>
#include <cstddef>
#include <cerrno>
#include <cstring>
#include <stdexcept>
#include <string>
#include <vector>
#ifdef _WIN32
#define NOMINMAX
#include <windows.h>
#include <winternl.h>
using Handle = HANDLE;
const Handle invalid = INVALID_HANDLE_VALUE;
#else
#include <dirent.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
using Handle = int;
const Handle invalid = -1;
#endif
struct Failure : std::runtime_error { std::string code; Failure(const std::string& message, const std::string& code): std::runtime_error(message), code(code) {} };
static std::string error_code(int code) {
#ifdef _WIN32
  switch(code) { case ERROR_FILE_NOT_FOUND: case ERROR_PATH_NOT_FOUND: return "ENOENT"; case ERROR_ALREADY_EXISTS: case ERROR_FILE_EXISTS: return "EEXIST"; case ERROR_DIR_NOT_EMPTY: return "ENOTEMPTY"; case ERROR_DIRECTORY: return "ENOTDIR"; case ERROR_ACCESS_DENIED: return "EACCES"; case ERROR_SHARING_VIOLATION: return "EBUSY"; default: return "EIO"; }
#else
  switch(code) { case ENOENT: return "ENOENT"; case EEXIST: return "EEXIST"; case ENOTEMPTY: return "ENOTEMPTY"; case ELOOP: return "ELOOP"; case ENOTDIR: return "ENOTDIR"; case EISDIR: return "EISDIR"; case EACCES: return "EACCES"; default: return "EIO"; }
#endif
}
static void fail(const char* op) {
#ifdef _WIN32
  int code = GetLastError();
#else
  int code = errno;
#endif
  throw Failure(std::string(op) + " failed (" + std::to_string(code) + ")", error_code(code));
}
static void close_handle(Handle h) {
#ifdef _WIN32
  if (h != invalid) CloseHandle(h);
#else
  if (h != invalid) close(h);
#endif
}
struct Scoped { Handle h; explicit Scoped(Handle h): h(h) {} ~Scoped(){ close_handle(h); } Scoped(const Scoped&) = delete; Handle release(){ Handle result=h; h=invalid; return result; } };
static void leaf(const std::string& name) {
  if (name.empty() || name == "." || name == ".." || name.find_first_of("/\\\0", 0, 3) != std::string::npos) throw Failure("Unsafe installation path", "EINVAL");
#ifdef _WIN32
  if (name.find_first_of(":<>\"|?*") != std::string::npos || name.back()=='.' || name.back()==' ') throw Failure("Unsafe Windows installation path", "EINVAL");
#endif
}
#ifdef _WIN32
static std::wstring wide(const std::string& s) { int size=MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, s.data(), static_cast<int>(s.size()), nullptr, 0); if (!size) fail("UTF-8 path"); std::wstring result(size, 0); MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, s.data(), static_cast<int>(s.size()), result.data(), size); return result; }
static std::string utf8(const std::wstring& s) { int size=WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, s.data(), static_cast<int>(s.size()), nullptr, 0, nullptr, nullptr); if (!size) fail("UTF-16 path"); std::string result(size,0); WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS,s.data(),static_cast<int>(s.size()),result.data(),size,nullptr,nullptr); return result; }
using CreateFn = NTSTATUS (NTAPI*)(PHANDLE,ACCESS_MASK,POBJECT_ATTRIBUTES,PIO_STATUS_BLOCK,PLARGE_INTEGER,ULONG,ULONG,ULONG,ULONG,PVOID,ULONG);
using SetFn = NTSTATUS (NTAPI*)(HANDLE,PIO_STATUS_BLOCK,PVOID,ULONG,FILE_INFORMATION_CLASS);
using QueryFn = NTSTATUS (NTAPI*)(HANDLE,HANDLE,PVOID,PVOID,PIO_STATUS_BLOCK,PVOID,ULONG,FILE_INFORMATION_CLASS,BOOLEAN,PUNICODE_STRING,BOOLEAN);
static void status(NTSTATUS result) { if (result < 0) { using Convert=ULONG(WINAPI*)(NTSTATUS); auto convert=reinterpret_cast<Convert>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"RtlNtStatusToDosError")); SetLastError(convert(result)); fail("Relative filesystem operation"); } }
static Handle open_at(Handle parent, const std::string& name, bool directory, bool create, bool exclusive=false, bool writable=false, bool deletion=false) {
  leaf(name); std::wstring w=wide(name); if (w.size()*sizeof(wchar_t)>65534) throw Failure("Path component too long", "EINVAL");
  UNICODE_STRING string{}; string.Buffer=w.data(); string.Length=static_cast<USHORT>(w.size()*sizeof(wchar_t)); string.MaximumLength=string.Length;
  OBJECT_ATTRIBUTES attributes{}; attributes.Length=sizeof(attributes); attributes.RootDirectory=parent; attributes.ObjectName=&string; attributes.Attributes=OBJ_CASE_INSENSITIVE;
  IO_STATUS_BLOCK io{}; Handle h=invalid;
  auto fn=reinterpret_cast<CreateFn>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtCreateFile"));
  if (!fn) throw Failure("NtCreateFile unavailable", "ENOTSUP");
  ACCESS_MASK access = SYNCHRONIZE | FILE_READ_ATTRIBUTES | (directory ? FILE_LIST_DIRECTORY | FILE_TRAVERSE : FILE_READ_DATA);
  if (writable) access |= FILE_WRITE_DATA; if (deletion) access |= DELETE;
  status(fn(&h,access,&attributes,&io,nullptr,FILE_ATTRIBUTE_NORMAL,FILE_SHARE_READ,exclusive ? 2 : create ? 3 : 1,0x00200000 | 0x20 | (directory ? 1 : 0x40),nullptr,0));
  Scoped opened(h); BY_HANDLE_FILE_INFORMATION info{}; if (!GetFileInformationByHandle(h,&info)) fail("File attributes");
  if (info.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) throw Failure("Unsafe installation directory or destination (reparse point)","ELOOP");
  if (GetFileType(h)!=FILE_TYPE_DISK) throw Failure("Unsafe installation special file","EINVAL");
  return opened.release();
}
static Handle open_root(const std::string& s) {
  std::wstring full=wide(s), root; size_t offset;
  if (full.size()>=3 && full[1]==L':' && full[2]==L'\\') { root=full.substr(0,3); offset=3; }
  else if (full.rfind(L"\\\\",0)==0) { size_t server=full.find(L'\\',2), share=server==std::wstring::npos ? server : full.find(L'\\',server+1); if (server==std::wstring::npos) throw Failure("Invalid UNC root","EINVAL"); offset=share==std::wstring::npos ? full.size() : share+1; root=full.substr(0,offset); }
  else throw Failure("Absolute Windows root required","EINVAL");
  Handle h=CreateFileW(root.c_str(),FILE_LIST_DIRECTORY|FILE_READ_ATTRIBUTES|FILE_TRAVERSE|SYNCHRONIZE,FILE_SHARE_READ,nullptr,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);
  if (h==invalid) fail("Open installation volume"); Scoped current(h);
  wchar_t filesystem[64]{}; if (!GetVolumeInformationByHandleW(h,nullptr,0,nullptr,nullptr,nullptr,filesystem,64)) fail("Volume capabilities");
  if (wcscmp(filesystem,L"NTFS") && wcscmp(filesystem,L"ReFS")) throw Failure("Secure installation requires NTFS or ReFS on Windows","ENOTSUP");
  while(offset<full.size()) { size_t end=full.find(L'\\',offset); if(end==std::wstring::npos) end=full.size(); if(end>offset){ Handle next=open_at(current.h,utf8(full.substr(offset,end-offset)),true,false); close_handle(current.h); current.h=next; } offset=end+1; }
  return current.release();
}
static void mkdir_at(Handle parent, const std::string& name) { Scoped created(open_at(parent,name,true,true,true)); }
static bool is_file(Handle parent, const std::string& name) {
  leaf(name);
  // Open as either type so a directory produces EISDIR, not an ambiguous access failure.
  std::wstring w=wide(name); UNICODE_STRING string{}; string.Buffer=w.data();string.Length=static_cast<USHORT>(w.size()*2);string.MaximumLength=string.Length;
  OBJECT_ATTRIBUTES attributes{};attributes.Length=sizeof(attributes);attributes.RootDirectory=parent;attributes.ObjectName=&string;attributes.Attributes=OBJ_CASE_INSENSITIVE;
  IO_STATUS_BLOCK io{};Handle h=invalid;auto fn=reinterpret_cast<CreateFn>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtCreateFile"));
  NTSTATUS result=fn(&h,FILE_READ_ATTRIBUTES|SYNCHRONIZE,&attributes,&io,nullptr,0,FILE_SHARE_READ,1,0x00200000|0x20,nullptr,0);
  if(result<0){try{status(result);}catch(const Failure& error){if(error.code=="ENOENT")return false;throw;}}
  Scoped file(h);BY_HANDLE_FILE_INFORMATION info{};if(!GetFileInformationByHandle(h,&info))fail("File attributes");
  if(info.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT)throw Failure("Unsafe installation destination (reparse point)","ELOOP");
  if(info.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)throw Failure("Unsafe installation destination (directory)","EISDIR");return true;
}
static void rename_at(Handle from,const std::string& name,Handle to,const std::string& target) {
  leaf(target);Scoped file(open_at(from,name,false,false,false,false,true)); is_file(to,target);
  std::wstring w=wide(target); struct Rename { BOOLEAN replace; HANDLE root; ULONG length; WCHAR name[1]; };
  std::vector<unsigned char> buffer(offsetof(Rename,name)+w.size()*2);auto info=reinterpret_cast<Rename*>(buffer.data());info->replace=TRUE;info->root=to;info->length=static_cast<ULONG>(w.size()*2);memcpy(info->name,w.data(),info->length);
  IO_STATUS_BLOCK io{};auto fn=reinterpret_cast<SetFn>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtSetInformationFile"));status(fn(file.h,&io,info,static_cast<ULONG>(buffer.size()),static_cast<FILE_INFORMATION_CLASS>(10)));
}
static void remove_at(Handle parent,const std::string& name,bool directory) {
  Scoped file(open_at(parent,name,directory,false,false,false,true));BOOLEAN remove=TRUE;IO_STATUS_BLOCK io{};auto fn=reinterpret_cast<SetFn>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtSetInformationFile"));status(fn(file.h,&io,&remove,sizeof(remove),static_cast<FILE_INFORMATION_CLASS>(13)));
}
static std::vector<std::string> list_at(Handle h) {
  struct Names { ULONG next,index,length; WCHAR name[1]; };
  std::vector<std::string> result;std::vector<unsigned char> buffer(65536);IO_STATUS_BLOCK io{};
  auto fn=reinterpret_cast<QueryFn>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtQueryDirectoryFile"));bool first=true;
  for(;;){NTSTATUS value=fn(h,nullptr,nullptr,nullptr,&io,buffer.data(),static_cast<ULONG>(buffer.size()),static_cast<FILE_INFORMATION_CLASS>(12),FALSE,nullptr,first);first=false;if(value==static_cast<NTSTATUS>(0x80000006L))break;status(value);size_t offset=0;for(;;){auto item=reinterpret_cast<Names*>(buffer.data()+offset);std::string name=utf8(std::wstring(item->name,item->length/2));if(name!="."&&name!="..")result.push_back(name);if(!item->next)break;offset+=item->next;}}
  return result;
}
#else
static Handle open_at(Handle parent,const std::string& name,bool directory,bool create,bool exclusive=false,bool writable=false,bool deletion=false) {
  (void)deletion;leaf(name);if(directory&&create&&mkdirat(parent,name.c_str(),0700)<0&&errno!=EEXIST)fail("Create installation directory");
  int flags=(writable?O_WRONLY:O_RDONLY)|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK|(directory?O_DIRECTORY:0)|(exclusive?O_CREAT|O_EXCL:0);
  int fd=openat(parent,name.c_str(),flags,0600);if(fd<0)fail("Unsafe installation directory or file");Scoped opened(fd);struct stat info{};if(fstat(fd,&info))fail("File attributes");if(!directory&&!S_ISREG(info.st_mode))throw Failure("Unsafe installation special file","EINVAL");return opened.release();
}
static Handle open_root(const std::string& path) {
  if(path.empty()||path[0]!='/')throw Failure("Absolute POSIX root required","EINVAL");Scoped current(open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC));if(current.h<0)fail("Open filesystem root");size_t offset=1;
  while(offset<path.size()){size_t end=path.find('/',offset);if(end==std::string::npos)end=path.size();if(end>offset){Handle next=open_at(current.h,path.substr(offset,end-offset),true,false);close_handle(current.h);current.h=next;}offset=end+1;}return current.release();
}
static void mkdir_at(Handle parent,const std::string& name){leaf(name);if(mkdirat(parent,name.c_str(),0700))fail("Create installation directory");}
static bool is_file(Handle parent,const std::string& name) {leaf(name);struct stat info{};if(fstatat(parent,name.c_str(),&info,AT_SYMLINK_NOFOLLOW)<0){if(errno==ENOENT)return false;fail("File attributes");}if(S_ISDIR(info.st_mode))throw Failure("Unsafe installation destination (directory)","EISDIR");if(!S_ISREG(info.st_mode))throw Failure("Unsafe installation destination (not a regular file)","ELOOP");return true;}
static void rename_at(Handle from,const std::string& name,Handle to,const std::string& target){leaf(name);leaf(target);is_file(from,name);is_file(to,target);if(renameat(from,name.c_str(),to,target.c_str()))fail("Rename installation file");}
static void remove_at(Handle parent,const std::string& name,bool directory){leaf(name);if(!directory)is_file(parent,name);if(unlinkat(parent,name.c_str(),directory?AT_REMOVEDIR:0))fail("Remove installation entry");}
static std::vector<std::string> list_at(Handle h){int fd=dup(h);if(fd<0)fail("Duplicate directory");DIR* dir=fdopendir(fd);if(!dir){close(fd);fail("Read directory");}rewinddir(dir);std::vector<std::string> result;errno=0;while(auto entry=readdir(dir)){std::string name=entry->d_name;if(name!="."&&name!="..")result.push_back(name);}int error=errno;closedir(dir);if(error){errno=error;fail("Read directory");}return result;}
#endif
struct Directory { Handle h; };
static void finalize(napi_env,void* data,void*){auto dir=static_cast<Directory*>(data);close_handle(dir->h);delete dir;}
static napi_value wrap(napi_env env,Handle h){napi_value result;auto dir=new Directory{h};if(napi_create_external(env,dir,finalize,nullptr,&result)!=napi_ok){finalize(env,dir,nullptr);throw Failure("Cannot wrap directory handle","EIO");}return result;}
static Handle handle(napi_env env,napi_value value){void* data=nullptr;if(napi_get_value_external(env,value,&data)!=napi_ok||!data)throw Failure("Invalid directory capability","EINVAL");auto dir=static_cast<Directory*>(data);if(dir->h==invalid)throw Failure("Closed directory capability","EBADF");return dir->h;}
static std::string text(napi_env env,napi_value value){size_t size;if(napi_get_value_string_utf8(env,value,nullptr,0,&size)!=napi_ok)throw Failure("Expected string","EINVAL");std::vector<char> data(size+1);napi_get_value_string_utf8(env,value,data.data(),data.size(),&size);return std::string(data.data(),size);}
static bool boolean(napi_env env,napi_value value){bool result;if(napi_get_value_bool(env,value,&result)!=napi_ok)throw Failure("Expected boolean","EINVAL");return result;}
static napi_value operation(napi_env env,napi_callback_info info){
  napi_value args[4], result;size_t count=4;void* data;napi_get_cb_info(env,info,&count,args,nullptr,&data);std::string op=static_cast<const char*>(data);napi_get_undefined(env,&result);
  try{
    size_t expected=(op=="rename"?4:op=="directory"||op=="writeFile"||op=="remove"?3:op=="openRoot"||op=="list"||op=="close"?1:2);
    if(count!=expected)throw Failure("Invalid native operation arguments","EINVAL");
    if(op=="openRoot")return wrap(env,open_root(text(env,args[0])));
    Handle parent=handle(env,args[0]);
    if(op=="close"){void* pointer;napi_get_value_external(env,args[0],&pointer);auto dir=static_cast<Directory*>(pointer);close_handle(dir->h);dir->h=invalid;return result;}
    if(op=="list"){auto names=list_at(parent);napi_create_array_with_length(env,names.size(),&result);for(size_t i=0;i<names.size();i++){napi_value value;napi_create_string_utf8(env,names[i].c_str(),names[i].size(),&value);napi_set_element(env,result,static_cast<uint32_t>(i),value);}return result;}
    std::string name=text(env,args[1]);leaf(name);
    if(op=="directory")return wrap(env,open_at(parent,name,true,boolean(env,args[2])));
    if(op=="mkdir"){mkdir_at(parent,name);return result;}
    if(op=="assertFile"){is_file(parent,name);return result;}
    if(op=="rename"){rename_at(parent,name,handle(env,args[2]),text(env,args[3]));return result;}
    if(op=="remove"){remove_at(parent,name,boolean(env,args[2]));return result;}
    if(op=="writeFile"){
      void* buffer;size_t length;if(napi_get_buffer_info(env,args[2],&buffer,&length)!=napi_ok)throw Failure("Expected Buffer","EINVAL");Scoped file(open_at(parent,name,false,true,true,true));size_t offset=0;
      while(offset<length){
#ifdef _WIN32
        DWORD written=0;if(!WriteFile(file.h,static_cast<char*>(buffer)+offset,static_cast<DWORD>(std::min(length-offset,size_t(1048576))),&written,nullptr))fail("Write installation file");size_t size=written;
#else
        ssize_t written=write(file.h,static_cast<char*>(buffer)+offset,length-offset);if(written<0){if(errno==EINTR)continue;fail("Write installation file");}size_t size=static_cast<size_t>(written);
#endif
        if(!size)throw Failure("Incomplete installation write","EIO");offset+=size;
      }return result;
    }
    if(op=="readFile"){
      Scoped file(open_at(parent,name,false,false));std::vector<char> content;char buffer[65536];
      for(;;){
#ifdef _WIN32
        DWORD size=0;if(!ReadFile(file.h,buffer,sizeof(buffer),&size,nullptr))fail("Read installation file");
#else
        ssize_t size=read(file.h,buffer,sizeof(buffer));if(size<0){if(errno==EINTR)continue;fail("Read installation file");}
#endif
        if(!size)break;if(content.size()+size>64*1024*1024)throw Failure("Installation read exceeds 64 MiB","EFBIG");content.insert(content.end(),buffer,buffer+size);
      }void* copied;napi_create_buffer_copy(env,content.size(),content.data(),&copied,&result);return result;
    }
    throw Failure("Unknown operation","EINVAL");
  }catch(const Failure& error){napi_value message,exception,code;napi_create_string_utf8(env,error.what(),NAPI_AUTO_LENGTH,&message);napi_create_error(env,nullptr,message,&exception);napi_create_string_utf8(env,error.code.c_str(),NAPI_AUTO_LENGTH,&code);napi_set_named_property(env,exception,"code",code);napi_throw(env,exception);return nullptr;}
  catch(const std::exception& error){napi_throw_error(env,"EIO",error.what());return nullptr;}
}
static napi_value initialize(napi_env env,napi_value exports){for(const char* name:{"openRoot","directory","mkdir","assertFile","readFile","writeFile","rename","remove","list","close"}){napi_value fn;napi_create_function(env,name,NAPI_AUTO_LENGTH,operation,const_cast<char*>(name),&fn);napi_set_named_property(env,exports,name,fn);}return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME, initialize)
