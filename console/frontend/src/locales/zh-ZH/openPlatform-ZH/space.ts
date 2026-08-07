const translation = {
  spaceNameExists: '空间名已存在',
  createSuccess: '空间创建成功！',
  updateSuccess: '空间更新成功！',
  createFailed: '创建空间失败',
  cancel: '取消',
  createLimitReached: '创建次数已达上限',
  confirm: '确定',
  save: '保存',
  createSpace: '创建新空间',
  editSpace: '编辑空间',
  bannerText:
    '通过创建空间,将支持项目、智能体、插件、工作流和知识库在空间内进行协作和共享',
  spaceName: '空间名称',
  pleaseEnterSpaceName: '请输入空间名称',
  spaceNameMaxLength: '空间名称不能超过50个字符',
  description: '描述',
  descriptionMaxLength: '描述不能超过2000个字符',
  describeSpace: '描述空间',
  goUpgrade: '去升级',
  spaceManagement: '空间管理',
  allSpaces: '全部空间',
  myCreated: '我创建的',
  createSpaceButton: '创建空间',
  searchSpacePlaceholder: '搜索你感兴趣的空间',
  personalSpace: '个人空间',
  mySpace: '我的空间',
  queryFailed: '查询失败',

  // EnterpriseSpaceEmptyMenu
  createTeamSharedSpace: '创建团队共享空间',
  createNewSpace: '创建新空间',
  joinTeamSpace: '加入团队下的空间',
  enterSpaceManagement: '进入空间管理',

  // BaseLayout & Common
  enterpriseSpaceAvatar: '企业空间头像',
  noData: '暂无数据',

  // OrderTypeDisplay
  useCustomEditionForMore: '请在定制版中使用更多功能',
  customEdition: '定制版',

  // MemberManage
  memberList: '成员列表',
  invitationManagement: '邀请管理',
  batchImportSuccess: '批量导入成功：{{count}}个成员',
  addMember: '添加成员',
  selectRole: '选择角色',
  pleaseEnterUsername: '请输入用户名',
  selectStatus: '选择状态',
  memberManagement: '成员管理',

  // TeamSettings
  leaveTeamEnterprise: '离开团队/企业',
  basicInfo: '基础信息',
  teamSettings: '团队设置',

  // InfoHeader
  teamNameCannotBeEmpty: '团队名称不能为空',
  modifySuccess: '修改成功',
  teamAvatar: '团队头像',
  pleaseEnterTeamName: '请输入团队名称',
  authorAvatar: '作者头像',
  avatarUploaded: '头像已上传!',
  uploadFailedOrExpired: '上传失败或套餐已过期',

  // TeamInfo
  enterpriseCertificationUpgradeSuccess: '企业认证升级成功！',
  teamId: '团队ID',
  organizationId: '组织ID',
  currentPackage: '当前套餐',
  creationTime: '创建时间',
  expirationTime: '到期时间',
  renewNow: '立即续费',

  // SpaceSearch
  searchUsername: '搜索用户名',
  search: '搜索',

  // EnterpriseCertificationCard
  upgradeToEnterpriseCertification: '升级为企业认证',
  importLogoAsEnterpriseLogo: '导入Logo徽章为企业LOGO',
  enableEnterpriseCertification: '开通为企业认证, 团队内所有成员都享受企业认证',
  upgradedToEnterpriseCertification: '已升级为企业认证',
  replace: '替换',
  logoUploaded: 'logo已上传!',

  // LeaveTeamModal
  enterprise: '企业',
  team: '团队',
  leaveTeam: '离开团队',
  leaveEnterprise: '离开企业',
  leaveTeamConfirmContent:
    '确定离开团队吗？离开后所有资源将归属于团队，自创建的空间所有者将由团队的超级管理员接替。',
  leaveEnterpriseConfirmContent:
    '确定离开企业吗？离开后所有资源将归属于企业，自创建的空间所有者将由企业的超级管理员接替。',
  checkSuperAdminErrorTeam: '判断团队是否有另外的超级管理员失败',
  checkSuperAdminErrorEnterprise: '判断企业是否有另外的超级管理员失败',
  onlySuperAdminTeam: '您是团队唯一超级管理员，暂不支持离开团队',
  onlySuperAdminEnterprise: '您是企业唯一超级管理员，暂不支持离开团队',
  leaveTeamError: '离开团队失败',
  leaveEnterpriseError: '离开企业失败',
  leaveTeamSuccess: '离开团队成功',
  leaveEnterpriseSuccess: '离开企业成功',

  // DeleteSpaceModal
  deleteSpaceTitle: '删除空间',
  deleteSpaceSuccess: '删除空间成功',
  deleteSpaceWarning:
    '请谨慎删除！删除后，空间内的所有数据都将丢失，已分配的权益量将被扣除。',
  deleteSpaceConfirm:
    '确认删除空间？此操作不可撤销，空间内的所有数据都将永久丢失。',

  // LeaveSpaceModal
  leaveSpaceTitle: '离开空间',
  leaveSpaceSuccess: '离开空间成功',
  leaveSpaceConfirm: '确认离开 {{name}} 吗?',

  // TransferOwnershipModal
  transferOwnershipTitle: '转移空间所有权',
  transferOwnershipSuccess: '转让成功',
  transferOwnershipWarning: '转让所有权后,您的状态将改为管理员',
  transferOwnershipLabel: '将所有权转让给',
  transferOwnershipPlaceholder: '请选择成员',
  transferOwnershipSelectMember: '请选择要转让的成员',

  // AddMemberModal
  addNewMember: '添加新成员',
  enterUsername: '请输入用户名',
  memberLimitReached: '成员数量已达到最大值{{count}}',
  selectAtLeastOneUser: '请至少选择一个用户',
  searchToAddMembers: '搜索用户名以添加新成员',
  userNotFound: '未找到{{keyword}}相关用户',
  selectAll: '全部',
  searching: '搜索中...',
  selected: '选定: ',
  maxValue: '（最大值{{count}}）',

  // SpaceList
  applySuccess: '申请成功',
  accessSpaceFailed: '访问空间失败',
  noSpaceYet: '暂无空间，请先创建',

  // PersonSpace error messages
  getSpaceListFailed: '获取空间列表失败',
  getRecentVisitFailed: '获取最近访问列表失败',

  // SpaceTable
  totalDataCount: '共 {{total}} 项数据',
  operation: '操作',

  // Enterprise page
  personalVersionNoAccess: '您当前为个人版，无权访问企业空间',

  // Member management
  confirmDelete: '确认删除',
  confirmDeleteMember: '确定要删除成员 {{username}} 吗？',
  deleteSuccess: '删除成功',
  roleUpdateSuccess: '角色更新成功',
  delete: '删除',
  username: '用户名',
  role: '角色',
  createSpaceTip:
    '通过创建空间,将支持项目、智能体、插件、工作流和知识库在空间内进行协作和共享',
  spaceNameCannotExceed50Characters: '空间名称不能超过50个字符',
  pleaseEnterDescription: '请输入空间描述',
  descriptionCannotExceed2000Characters: '描述不能超过2000个字符',
  upgrade: '去升级',
  createTimesExceeded: '创建次数已达上限',
  allSpace: '全部空间',
  myCreatedSpace: '我创建的空间',
  enterManagement: '进入管理',
  enterSpace: '进入空间',
  applySpace: '申请空间',
  applying: '申请中',
  noPermission: '暂无权限',
  editSpaceInfo: '编辑空间信息',
  share: '分享',
  uploading: '上传中',
  imageProcessingNotCompleted: '图片处理未完成，请稍候...',
  cannotGetImageFile: '无法获取图片文件',
  uploadSuccess: '上传成功',

  // ActionList buttons
  applyForSpace: '申请空间',

  // InvitationManagement
  confirmRevoke: '确认撤回',
  confirmRevokeInvitation: '确定要撤回对 {{nickname}} 的邀请吗？',
  revokeSuccess: '撤回成功',
  revoke: '撤回',
  invitationStatus: '邀请状态',
  joinTime: '加入时间',

  // MemberManagement
  // AddMemberModal
  pleaseEnterPhoneNumber: '请输入手机号',
  maxMembersReached: '成员数量已达到最大值{{maxMembers}}',
  pleaseSelectAtLeastOneUser: '请至少选择一个用户',
  searchPhoneNumberToAddMembers: '搜索手机号以添加新成员',
  searchPhoneNumber: '搜索手机号',
  all: '全部',

  // SpaceSettings
  deleteSpace: '删除空间',
  leaveSpace: '离开空间',
  leaveSpaceWarning: '退出空间后将无法访问空间内容，需要重新邀请才能加入',
  transferOwnershipFailed: '转让所有权失败',
  transferSpaceOwnership: '转让空间所有权',
  transferOwnershipDescription: '将空间所有权转移给其他成员',
  transferSpace: '转让空间',

  // DetailHeader
  spaceAvatar: '空间头像',

  // UserItem
  invited: '已邀请',
  joined: '已加入',

  // TeamCreate
  pleaseEnterName: '请输入{{enterpriseType}}名称',
  teamNameExists: '{{enterpriseType}}名称已存在',
  teamCreateSuccess: '{{enterpriseType}}创建成功',
  teamCreateFailed: '{{enterpriseType}}创建失败',
  teamEditionAlreadyEffective: '{{enterpriseType}}版已生效',
  adminAvatar: '管理员头像',
  pleaseCompleteInfo: '请完成{{enterpriseType}}信息设置',
  upload: '上传',
  avatar: '头像',
  name: '{{enterpriseType}}名称',
  create: '创建{{enterpriseType}}',
  avatarUploadSuccess: '头像已上传!',
};

export default translation;
