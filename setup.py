from setuptools import setup, find_packages

setup(
    name="hephaestus",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "aiohttp>=3.8.0",
        "fastapi>=0.68.0",
        "uvicorn>=0.15.0",
    ],
    author="Casey Koons",
    author_email="cskoons@gmail.com",
    description="Integrated GUI for Tekton Multi-AI Engineering Platform",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/cskoons/Hephaestus",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
    ],
    python_requires=">=3.9",
    entry_points={
        "console_scripts": [
            "hephaestus=hephaestus.ui.main:main",
        ],
    },
)