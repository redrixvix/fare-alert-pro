#!/usr/bin/env python3
"""
Flight price checker using fli library.
Searches specific dates and returns price data.
"""
import sys
sys.path.insert(0, '/home/rixvix/.local/lib/python3.12/site-packages')

import json
import asyncio
from fli.search import SearchFlights, SearchDates
from fli.models.google_flights.flights import (
    FlightSearchFilters, PassengerInfo, FlightSegment,
    TripType, MaxStops, SeatType
)
from fli.models.google_flights.dates import DateSearchFilters
from datetime import datetime, timedelta

def search_price(origin, destination, date_str):
    """Get price for a specific route and date."""
    sf = SearchFlights()
    
    passenger_info = PassengerInfo(
        adults=1,
        children=0,
        infants=0,
        total_adults=1
    )
    
    segment = FlightSegment(
        travel_date=date_str,
        departure_airport=[[origin, 0]],
        arrival_airport=[[destination, 0]]
    )
    
    filters = FlightSearchFilters(
        trip_type=TripType.ONE_WAY,
        passenger_info=passenger_info,
        flight_segments=[segment],
        stops=MaxStops.ANY,
        seat_type=SeatType.ECONOMY,
        show_all_results=True,
        sort_by=1
    )
    
    try:
        results = sf.search(filters, top_n=3)
        if not results:
            return {'route': f'{origin}-{destination}', 'date': date_str, 'price': None, 'error': 'No results'}
        
        prices = []
        for r in results:
            if isinstance(r, tuple):
                r = r[0]
            price_val = None
            currency = 'USD'
            if r.price:
                price_val = r.price.price_raw
                currency = r.price.currency
            prices.append({
                'price': price_val,
                'currency': currency,
                'airline': r.legs[0].segments[0].airline.code if r.legs and r.legs[0].segments else None,
                'duration': r.legs[0].duration.total_minutes if r.legs else None,
            })
        
        return {
            'route': f'{origin}-{destination}',
            'date': date_str,
            'prices': prices,
            'lowest_price': min(p['price'] for p in prices if p['price']) if prices else None,
            'currency': prices[0]['currency'] if prices else 'USD'
        }
    except Exception as e:
        return {'route': f'{origin}-{destination}', 'date': date_str, 'error': str(e)}

def get_cheapest_dates(origin, destination, from_date, to_date):
    """Get cheapest dates in a range."""
    sd = SearchDates()
    
    passenger_info = PassengerInfo(
        adults=1,
        children=0,
        infants=0,
        total_adults=1
    )
    
    segment = FlightSegment(
        travel_date=from_date,  # just needs a date
        departure_airport=[[origin, 0]],
        arrival_airport=[[destination, 0]]
    )
    
    filters = DateSearchFilters(
        trip_type=TripType.ONE_WAY,
        passenger_info=passenger_info,
        flight_segments=[segment],
        stops=MaxStops.ANY,
        seat_type=SeatType.ECONOMY,
        from_date=from_date,
        to_date=to_date,
    )
    
    try:
        results = sd.search(filters)
        if not results:
            return {'route': f'{origin}-{destination}', 'error': 'No dates found'}
        
        dates_data = []
        for r in results:
            dates_data.append({
                'date': r.date,
                'price': r.price.price_raw if r.price else None,
                'currency': r.price.currency if r.price else 'USD',
            })
        
        return {
            'route': f'{origin}-{destination}',
            'dates': sorted(dates_data, key=lambda x: x['date'])
        }
    except Exception as e:
        return {'route': f'{origin}-{destination}', 'error': str(e)}

if __name__ == '__main__':
    import sys
    if len(sys.argv) >= 3:
        origin = sys.argv[1]
        destination = sys.argv[2]
        date_str = sys.argv[3] if len(sys.argv) > 3 else (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        result = search_price(origin, destination, date_str)
    else:
        # Test
        result = search_price('JFK', 'LAX', '2026-05-15')
    
    print(json.dumps(result, indent=2))