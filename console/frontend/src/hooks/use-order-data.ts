import { useEffect } from 'react';
import useOrderStore from '@/store/spark-store/order-store';
import {
  getOrderList,
  getUserMeta,
  getTeamMeta,
  getSpecialUser,
} from '@/services/order';
import useSpaceStore from '@/store/space-store';

/** ## 用户订单数据 hooks
 * @description 根据订单状态、有效期(暂无)筛选出用户当前套餐
 * @description 根据 trace日志 expireTime 确定traceLog页可筛选范围
 */
export default function useOrderData() {
  const {
    setUserOrderList,
    setUserOrderType,
    setUserOrderMeta,
    setSpaceTypeAtom,
    setIsSpecialUser,
  } = useOrderStore();

  const spaceType = useSpaceStore(state => state.spaceType);

  useEffect(() => {
    setSpaceTypeAtom(spaceType);
  }, [spaceType, setSpaceTypeAtom]);

  /** ## 获取用户订单数据，判断用户套餐等级
   * @description 筛选出用户当前套餐等级，设置 userOrderType
   * @description 筛选出用户当前套餐，设置 userOrderNow
   */
  const fetchOrderList = async (): Promise<void> => {
    try {
      const params = { page: '1', pageSize: '50' };
      const res = await getOrderList(params);
      setUserOrderList(res);
    } catch (error) {
      console.error('获取订单列表失败:', error);
      setUserOrderType('free');
    }
  };

  /** ## 获取当前用户套餐 -- 根据个人版还是空间版做区分 */
  const fetchUserMeta = async (): Promise<void> => {
    try {
      const res = await (spaceType === 'team' ? getTeamMeta() : getUserMeta());
      // console.log('🚀 ~ useOrderData.ts:115 ~ res:', res);

      if (res?.length > 0) {
        setUserOrderMeta(res);
      }
    } catch (error) {
      console.error('获取用户套餐失败:', error);
    }
  };

  /** ## 获取是否为特定用户 */
  const fetchSpecialUser = async (): Promise<void> => {
    try {
      const res = await getSpecialUser();
      setIsSpecialUser(Boolean(res));
    } catch (error) {
      // console.error('获取是否为特定用户失败:', error);
    }
  };

  return { fetchOrderList, fetchUserMeta, fetchSpecialUser };
}
