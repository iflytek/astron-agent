import ctypes


class BaseClass:
    """
    Base class for all classes in this module
    """

    _lib = None

    @classmethod
    def get_lib(cls, ctype_filename: str) -> ctypes.CDLL:
        """
        Get the library
        """
        if BaseClass._lib is None:
            # print("Loading .so file for the first time...")
            BaseClass._lib = ctypes.CDLL(ctype_filename)
        return BaseClass._lib
