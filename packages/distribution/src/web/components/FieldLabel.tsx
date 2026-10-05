import { Typography } from 'antd';

export function FieldLabel({ children }: { children: string }) {
  return (
    <Typography.Text
      type="secondary"
      className="!text-xs !uppercase tracking-wide"
    >
      {children}
    </Typography.Text>
  );
}
