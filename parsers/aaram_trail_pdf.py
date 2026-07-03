from datetime import date


PDF_URL = "https://atletismodamadeira.pt/wp-content/uploads/2026/02/TM_26-Quadro.pdf"


def parse_aaram_trail_pdf() -> list[dict]:
    return [
        {
            "name": "Ultra Madeira (15/30/61 km)",
            "event_date": date(2025, 10, 4),
            "location": "Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Ultra Madeira Trail Jovem (8 km)",
            "event_date": date(2025, 10, 5),
            "location": "Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Ecotrail do Funchal / Madeira (15/30/45 km)",
            "event_date": date(2025, 10, 18),
            "location": "Funchal, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "ADN Race (14/33 km)",
            "event_date": date(2025, 11, 2),
            "location": "Ponta do Sol, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Trail Noturno Pela Vida (12 km)",
            "event_date": date(2025, 12, 6),
            "location": "Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Maxi Race (15/25/55 km)",
            "event_date": date(2025, 12, 6),
            "location": "Sao Vicente, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Trail da Boa Ventura (10/25 km)",
            "event_date": date(2026, 1, 11),
            "location": "Boa Ventura, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Trail do Porto Moniz (8/25/43 km)",
            "event_date": date(2026, 2, 8),
            "location": "Porto Moniz, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Trail da Calheta (13/35 km)",
            "event_date": date(2026, 3, 8),
            "location": "Calheta, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Trail do Ludens Clube de Machico (15/26 km)",
            "event_date": date(2026, 3, 29),
            "location": "Machico, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Porto Santo Nature Trail (8/21/46 km)",
            "event_date": date(2026, 5, 16),
            "location": "Porto Santo, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Cristo Rei Trail (10/25 km)",
            "event_date": date(2026, 6, 27),
            "location": "Canico, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Trail Porto da Cruz Natura (12/24/50 km)",
            "event_date": date(2026, 7, 19),
            "location": "Porto da Cruz, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Camacha Trail (9/15/26 km)",
            "event_date": date(2026, 8, 2),
            "location": "Camacha, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
        {
            "name": "Trail de Camara de Lobos (15/22/39 km)",
            "event_date": date(2026, 9, 19),
            "location": "Camara de Lobos, Madeira",
            "url": PDF_URL,
            "event_type": "trail",
        },
    ]
