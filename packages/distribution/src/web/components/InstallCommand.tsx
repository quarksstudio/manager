import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Button, Flex, Typography } from 'antd';

async function copyText(value: string): Promise<boolean> {
  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path.
  }
  const area = document.createElement('textarea');
  area.value = value;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  return copied;
}

export function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    const ok = await copyText(command);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <Flex align="center" gap={8} className="rounded border px-3 py-2">
      <Typography.Text
        className="min-w-0 flex-1 truncate font-mono !text-sm"
        code
      >
        {command}
      </Typography.Text>
      <Button
        type="text"
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        aria-label={copied ? 'Copied' : 'Copy install command'}
        data-testid="copy-install"
        onClick={() => void handleClick()}
      />
    </Flex>
  );
}
