#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/rixvix/.local/lib/python3.12/site-packages')

from fli.models.google_flights.dates import DateSearchFilters, DateSearchSegment

# Check fields
print("DateSearchFilters fields:", DateSearchFilters.model_fields.keys())
print("DateSearchSegment fields:", DateSearchSegment.model_fields.keys())