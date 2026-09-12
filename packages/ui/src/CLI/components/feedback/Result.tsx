import React from 'react';
import { Text } from 'ink';

interface ResultProps {
  success: boolean;
  message: string;
  detail?: string;
}

export function Result({ success, message, detail }: ResultProps) {
  return (
    <Text color={success ? 'green' : 'red'}>
      {success ? '✔' : '✖'} {message}
      {detail ? ` — ${detail}` : ''}
    </Text>
  );
}
