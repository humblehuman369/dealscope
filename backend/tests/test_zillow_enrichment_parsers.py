"""Unit tests for Zillow enrichment response parsers."""

from app.services.zillow_client import ZillowDataExtractor


class TestZillowEnrichmentParsers:
    def test_parse_tax_history(self):
        rows = ZillowDataExtractor.parse_tax_history(
            {
                "taxHistory": [
                    {"time": 2023, "taxPaid": 5200, "value": 410000, "landValue": 90000},
                ]
            }
        )
        assert len(rows) == 1
        assert rows[0]["year"] == 2023
        assert rows[0]["tax_paid"] == 5200
        assert rows[0]["assessed_value"] == 410000

    def test_parse_nearby_schools(self):
        schools = ZillowDataExtractor.parse_nearby_schools(
            {
                "schools": [
                    {
                        "name": "Test Elementary",
                        "level": "Elementary",
                        "grades": "K-5",
                        "rating": 8,
                        "distance": 0.4,
                        "type": "Public",
                    }
                ]
            }
        )
        assert len(schools) == 1
        assert schools[0]["name"] == "Test Elementary"
        assert schools[0]["rating"] == 8.0

    def test_parse_zestimate_history(self):
        points = ZillowDataExtractor.parse_zestimate_history(
            {"zestimateHistory": [{"date": "2024-01-01", "value": 450000}, {"date": "2024-06-01", "value": 460000}]}
        )
        assert len(points) == 2
        assert points[0]["value"] == 450000
