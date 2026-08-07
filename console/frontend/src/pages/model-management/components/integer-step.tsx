import { useState, useEffect, FC } from 'react';
import type { InputNumberProps } from 'antd';
import { Col, Row, Slider } from 'antd';

import type { SliderSingleProps } from 'antd';
import { IntegerStepProps } from '@/types/model';

const IntegerStep: FC<IntegerStepProps> = ({
  max,
  value,
  defaultValue = 0,
  onChange,
}) => {
  // 非受控模式用内部 state；受控模式用外部 value
  const [innerVal, setInnerVal] = useState(
    value !== undefined ? defaultValue : defaultValue
  );

  // 同步受控值
  useEffect(() => {
    if (value !== undefined) {
      setInnerVal(value);
    }
  }, [value]);

  const handleChange: InputNumberProps['onChange'] = newValue => {
    const v = typeof newValue === 'number' ? newValue : 1;
    // 内部 state（非受控）
    if (value === undefined) setInnerVal(v);
    // 抛给父组件
    onChange?.(v);
  };

  const marks: SliderSingleProps['marks'] = {
    0: '0',
    32: '32k',
    64: '64k',
    [max]: `max`,
  };

  return (
    <Row gutter={[8, 8]} className="w-full">
      <Col span={24}>
        <div className="px-2">
          <Slider
            className="[&_.ant-slider-track]:border-t-2 [&_.ant-slider-track]:border-t-[#6356EA] [&_.ant-slider-mark-text]:font-pingfang [&_.ant-slider-mark-text]:text-xs [&_.ant-slider-mark-text]:font-normal [&_.ant-slider-mark-text]:leading-4 [&_.ant-slider-mark-text]:text-gray-500"
            min={0}
            max={max}
            value={innerVal}
            onChange={handleChange}
            marks={marks}
          />
        </div>
      </Col>
    </Row>
  );
};

export default IntegerStep;
