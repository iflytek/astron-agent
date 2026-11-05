import type { ReactElement } from 'react';
import { Typography } from 'antd';

export default function Credential({ value }: { value: string }): ReactElement {
  return value ? (
    <Typography.Text copyable={{ text: value }}>
      {value.slice(0, 2)}••••••••{value.slice(-2)}
    </Typography.Text>
  ) : (
    <>—</>
  );
}
