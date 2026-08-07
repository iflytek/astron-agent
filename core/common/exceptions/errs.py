from common.exceptions.base import BaseExc


class BaseCommonException(BaseExc):
    """基础common异常类"""

    pass


class OssServiceException(BaseCommonException):
    """oss服务异常"""

    pass


class AuditServiceException(BaseCommonException):
    """audit服务异常"""

    pass
