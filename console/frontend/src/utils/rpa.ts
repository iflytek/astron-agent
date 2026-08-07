import { v4 as uuid } from 'uuid';
import { RpaParameter } from '@/types/rpa';
export const transRpaParameters = (parameters: RpaParameter[]): unknown[] => {
  return parameters.map(item => ({
    id: uuid(),
    name: item.varName,
    type: item.type,
    disabled: false,
    required: false,
    description: item.varDescribe,
    schema: {
      type: item.type,
      value: {
        type: 'ref',
        content: {},
      },
    },
  }));
};
