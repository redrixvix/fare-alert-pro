#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/rixvix/.local/lib/python3.12/site-packages')

from fli.search import SearchFlights
from fli.models.google_flights.flights import FlightSearchFilters, PassengerInfo, FlightSegment, TripType, MaxStops, SeatType
from datetime import datetime, timedelta

def search_route(origin, destination, date_str=None):
    sf = SearchFlights()
    
    if date_str is None:
        date_str = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    
    # Build passenger info
    passenger_info = PassengerInfo(
        adults=1,
        children=0,
        infants=0,
        total_adults=1
    )
    
    # Build flight segment - date format: YYYY-MM-DD
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
        sort_by=1  # Best match
    )
    
    try:
        results = sf.search(filters, top_n=5)
        if results is None:
            return {'error': 'No results', 'route': f'{origin}-{destination}', 'date': date_str}
        
        flights_data = []
        for r in results:
            if isinstance(r, tuple):
                r = r[0]
            flights_data.append({
                'price': r.price.price_raw if r.price else None,
                'currency': r.price.currency if r.price else None,
                'airline': r.legs[0].segments[0].airline.name if r.legs else None,
                'duration': r.legs[0].duration.total_minutes if r.legs else None,
                'stops': len(r.legs[0].segments) - 1 if r.legs else 0,
            })
        
        return {
            'route': f'{origin}-{destination}',
            'date': date_str,
            'flights': flights_data,
            'num_results': len(flights_data)
        }
    except Exception as e:
        import traceback
        return {'error': str(e), 'route': f'{origin}-{destination}', 'date': date_str}

if __name__ == '__main__':
    import json
    result = search_route('JFK', 'LAX', '2026-05-15')
    print(json.dumps(result))