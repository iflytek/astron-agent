import Icon from '@ant-design/icons';
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

const EllipsisSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    version="1.1"
    width="14"
    height="14"
    viewBox="0 0 14 14"
  >
    <defs>
      <clipPath id="master_svg0_67_14756/67_11950">
        <rect x="14" y="0" width="14" height="14" rx="0" />
      </clipPath>
    </defs>
    <g
      transform="matrix(0,1,-1,0,14,-14)"
      clipPath="url(#master_svg0_67_14756/67_11950)"
    >
      <g>
        <ellipse
          cx="21"
          cy="1.5"
          rx="1.5"
          ry="1.5"
          fill="#7F7F7F"
          fillOpacity="1"
        />
      </g>
      <g>
        <ellipse
          cx="21"
          cy="7"
          rx="1.5"
          ry="1.5"
          fill="#7F7F7F"
          fillOpacity="1"
        />
      </g>
      <g>
        <ellipse
          cx="21"
          cy="12.5"
          rx="1.5"
          ry="1.5"
          fill="#7F7F7F"
          fillOpacity="1"
        />
      </g>
    </g>
  </svg>
);

const EllipsisIcon = (props: Partial<CustomIconComponentProps>) => (
  <Icon component={EllipsisSvg} {...props} />
);

export { EllipsisIcon };
