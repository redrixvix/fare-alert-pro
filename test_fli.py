#!/usr/bin/env python3
import sys
sys.path.insert(0, '/usr/lib/python3.12/site-packages')

import asyncio
import flights

async def test():
    try:
        api = flights.Flapi()
        # Test a simple search: JFK to LAX, one way, 2026-05-01
        result = await api.search(
            legs=[
                flights.Leg(
                    origin="JFK",
                    destination="LAX",
                    date="2026-05-01"
                )
            ],
            adults=1,
            cabin_class=flights.CabinEconomy
        )
        print(f"Result type: {type(result)}")
        print(f"Result keys: {result.keys() if hasattr(result, 'keys') else 'N/A'}")
        if hasattr(result, 'flights'):
            print(f"Number of flights: {len(result.flights)}")
            for f in result.flights[:3]:
                print(f"  - {f.airline} {f.price} {f.duration}")
        else:
            print(str(result)[:500])
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test())