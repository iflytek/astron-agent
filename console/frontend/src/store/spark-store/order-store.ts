import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** 订单管理相关状态的Zustand Store */

export interface OrderMetaType {
  menu: string;
  startTime: string;
  endTime: string;
  isExpired: boolean;
}

/** 用户订单项接口 */
export interface UserOrderItem {
  [key: string]: unknown;
}

/** 当前订单接口 */
export interface CurrentOrder {
  [key: string]: unknown;
}

/** 跟踪列配置接口 */
export interface TraceColumnItem {
  [key: string]: unknown;
}

export interface OrderDerivedInfo {
  orderMeta: OrderMetaType[];
  orderShowArr: number[];
  useOrder: OrderMetaType;
  orderTraceAndIcon: number;
}

export interface OrderStore {
  // 订单管理
  userOrderList: UserOrderItem[];
  // 当前用户使用套餐类型
  userOrderType: string;
  // 当前用户使用套餐
  userOrderNow: CurrentOrder;
  // trace页列管理
  traceColumn: TraceColumnItem[];
  // 用户当前套餐 -- 接口返回数据
  userOrderMeta: OrderMetaType[];
  // 空间类型
  spaceTypeAtom: string;
  // 是否为特定用户
  isSpecialUser: boolean;
  // 派生信息
  orderDerivedInfo: OrderDerivedInfo;

  // 设置方法
  setUserOrderList: (list: UserOrderItem[]) => void;
  setUserOrderType: (type: string) => void;
  setUserOrderNow: (order: CurrentOrder) => void;
  setTraceColumn: (column: TraceColumnItem[]) => void;
  setUserOrderMeta: (meta: OrderMetaType[]) => void;
  setSpaceTypeAtom: (type: string) => void;
  setIsSpecialUser: (isSpecial: boolean) => void;

  // 计算派生信息的方法
  calculateDerivedInfo: () => OrderDerivedInfo;
}

const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      userOrderList: [],
      userOrderType: 'free',
      userOrderNow: {},
      traceColumn: [],
      userOrderMeta: [
        {
          menu: 'FREE_EDITION',
          startTime: '--',
          endTime: '--',
          isExpired: false,
        },
      ],
      spaceTypeAtom: 'personal',
      isSpecialUser: false,

      // 初始派生信息
      orderDerivedInfo: {
        orderMeta: [
          {
            menu: 'FREE_EDITION',
            startTime: '--',
            endTime: '--',
            isExpired: false,
          },
        ],
        orderShowArr: [0, 0],
        useOrder: {
          menu: 'FREE_EDITION',
          startTime: '--',
          endTime: '--',
          isExpired: false,
        },
        orderTraceAndIcon: 0,
      },

      // 设置方法
      setUserOrderList: (list: UserOrderItem[]): void => {
        set({ userOrderList: list });
      },
      setUserOrderType: (type: string): void => {
        set({ userOrderType: type });
      },
      setUserOrderNow: (order: CurrentOrder): void => {
        set({ userOrderNow: order });
      },
      setTraceColumn: (column: TraceColumnItem[]): void => {
        set({ traceColumn: column });
      },
      setUserOrderMeta: (meta: OrderMetaType[]): void => {
        set({ userOrderMeta: meta });
        // 更新派生信息
        const derivedInfo = get().calculateDerivedInfo();
        set({ orderDerivedInfo: derivedInfo });
      },
      setSpaceTypeAtom: (type: string): void => {
        set({ spaceTypeAtom: type });
        // 更新派生信息
        const derivedInfo = get().calculateDerivedInfo();
        set({ orderDerivedInfo: derivedInfo });
      },
      setIsSpecialUser: (isSpecial: boolean): void => {
        set({ isSpecialUser: isSpecial });
      },

      // 计算派生信息的方法
      calculateDerivedInfo: (): OrderDerivedInfo => {
        const state = get();
        const orderMeta = state.userOrderMeta;
        const spaceType = state.spaceTypeAtom;
        const orderShowArr = [0, 0]; // 使用的套餐显示数据 -- 当有第三项时, 表明第二项团队的套餐过期了
        let useOrder: OrderMetaType = orderMeta[0] || {
          menu: 'FREE_EDITION',
          startTime: '--',
          endTime: '--',
          isExpired: false,
        }; // 订单管理页显示当前套餐
        let orderTraceAndIcon = 0; // trace页/ 左下角Icon显示当前套餐

        orderMeta.forEach(item => {
          // spaceType可能为空, 就是普通的用户, 总共的值: personal, team, 或空
          if (spaceType === 'personal' || !spaceType) {
            if (item.menu === 'FREE_EDITION') {
              orderShowArr[0] = 0;
              useOrder = item;
              orderTraceAndIcon = 0;
            } else if (item.menu === 'PERSONAL_EDITION') {
              orderShowArr[0] = 1;
              useOrder = item;
              orderTraceAndIcon = 1;
            }
          } else {
            if (item.menu === 'TEAM_EDITION') {
              // item.status为false时，同时设置2，3项为 2,0，第一项不动
              if (item.isExpired) {
                orderShowArr[1] = 2;
                orderShowArr[2] = 0;
              } else {
                orderShowArr[1] = 2;
              }
              useOrder = item;
              orderTraceAndIcon = 2;
            } else if (item.menu === 'ENTERPRISE_EDITION') {
              if (item.isExpired) {
                orderShowArr[1] = 3;
                orderShowArr[2] = 0;
              } else {
                orderShowArr[1] = 3;
              }
              useOrder = item;
              orderTraceAndIcon = 3;
            } else {
              // 没有购买团队的套餐, 处于团队版下
              orderShowArr[1] = 0;
              orderTraceAndIcon = 0;
              useOrder = orderMeta[0] || {
                menu: 'FREE_EDITION',
                startTime: '--',
                endTime: '--',
                isExpired: false,
              };
            }
          }
        });

        return {
          orderMeta,
          orderShowArr,
          useOrder,
          orderTraceAndIcon,
        };
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: state => ({
        userOrderType: state.userOrderType,
        userOrderMeta: state.userOrderMeta,
        spaceTypeAtom: state.spaceTypeAtom,
      }),
    }
  )
);

export default useOrderStore;
