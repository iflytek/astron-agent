import home from './openPlatform-En/home';
import agentPage from './openPlatform-En/agentPage';
import prompt from './openPlatform-En/prompt';
import promption from './openPlatform-En/promption';
import shareModal from './openPlatform-En/shareModal';
import chatPage from './openPlatform-En/chatPage';
import commonModal from './openPlatform-En/commonModal';
import space from './openPlatform-En/space';
// 导入其他模块
import releaseManagement from './openPlatform-En/releaseManagement';
import global from './openPlatform-En/global';
import botApi from './openPlatform-En/botApi';
import feedback1 from './openPlatform-En/feedback';
import orderManagement from './openPlatform-En/orderManagement';
import comboContrastModal from './openPlatform-En/comboContrastModal';
import systemMessage from './openPlatform-En/systemMessage';
import createAgent1 from './openPlatform-En/createAgent';
import configBase from './openPlatform-En/configBase';
import loginModal from './openPlatform-En/loginModal';
import appManage from './openPlatform-En/appManage';
import virtualConfig from './openPlatform-En/virtualConfig';
import vmsInteractionCmp from './openPlatform-En/vmsInteractionCmp';

/** ## 开放平台的翻译配置 -- en
 * @description 注意模块名称不要跟星辰的重复
 */
export default {
  home,
  ...releaseManagement,
  global,
  botApi,
  feedback1,
  orderManagement,
  comboContrastModal,
  systemMessage,
  createAgent1,
  configBase,
  // 添加其他模块
  agentPage,
  ...prompt,
  promption,
  shareModal,
  chatPage,
  commonModal,
  loginModal,
  space,
  appManage,
  virtualConfig,
  vmsInteractionCmp,
};
