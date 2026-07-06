from setuptools import setup, find_packages

setup(
    name="astron-agent",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "aiohttp>=3.8",
    ],
    extras_require={
        "a2a": ["aiohttp"],
        "kagent": [],
    },
)
