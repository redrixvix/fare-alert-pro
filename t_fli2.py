#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/rixvix/.local/lib/python3.12/site-packages')

from fli.search import SearchDates, DatePrice

# DatePrice gives cheapest dates for a route
sd = SearchDates()
print("SearchDates methods:", [m for m in dir(sd) if not m.startswith('_')])

import inspect
sig = inspect.signature(SearchDates.search)
print(f"search signature: {sig}")