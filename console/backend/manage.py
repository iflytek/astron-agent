#!/usr/bin/env python
import os
import sys

from django.core.management import execute_from_command_line

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "astron_console.settings")
execute_from_command_line(sys.argv)
