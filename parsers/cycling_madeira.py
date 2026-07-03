from datetime import date


ACMADEIRA_CALENDAR_URL = "https://acmadeira.pt/wp-content/uploads/2026/03/Calendario-Atividades-11_03_2026.pdf"
ACMADEIRA_GRANFONDO_URL = "https://acmadeira.pt/evento/granfondo-calheta-2026/"
TRANS_MADEIRA_URL = "https://trans-madeira.com/the-race/"
RAT_RACE_MADEIRA_URL = "https://www.ratrace.com/madeira"
CLASSIC_RALLY_URL = "https://amak.pt/event/xxxvii-volta-a-madeira-classic-rally/"
RALI_MADEIRA_URL = "https://ralidamadeira.com/2026/en/frontpage"
RALLY_MADEIRA_LEGEND_URL = "https://rallymadeiralegend.pt/"
ECO_RALLY_MADEIRA_URL = "https://www.fia.com/championship/events/fia-ecorally-cup/season-2026/eco-rally-madeira"


def parse_cycling_madeira() -> list[dict]:
    return [
        {
            "name": "3ª Taça da Madeira de DHI - A Confeitaria",
            "event_date": date(2026, 5, 31),
            "location": "4 Estradas, Santa Cruz",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Trans Madeira Summer - Madeira Enduro",
            "event_date": date(2026, 5, 18),
            "location": "Madeira / Porto Santo",
            "url": TRANS_MADEIRA_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "1º Encontro de Escolas de CE - Brisa Sem Açúcar",
            "event_date": date(2026, 6, 7),
            "location": "Santana",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_kids",
        },
        {
            "name": "5ª Taça da Madeira de CE - Brisa Sem Açúcar",
            "event_date": date(2026, 6, 7),
            "location": "Santana",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "4ª Taça da Madeira de DHI e Mini-DHI - A Confeitaria",
            "event_date": date(2026, 6, 13),
            "location": "Chão das Feiteiras, Machico",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Campeonato da Madeira de Rampa - Brisa Sem Açúcar",
            "event_date": date(2026, 6, 20),
            "location": "Câmara de Lobos",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Encontro Regional de Escolas CE - Brisa Sem Açúcar",
            "event_date": date(2026, 7, 5),
            "location": "Ponta do Pargo, Calheta",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_kids",
        },
        {
            "name": "Encontro Regional de Escolas BTT",
            "event_date": date(2026, 7, 4),
            "location": "Ponta do Pargo, Calheta",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_kids",
        },
        {
            "name": "3ª Taça da Madeira de XCO",
            "event_date": date(2026, 7, 4),
            "location": "Ponta do Pargo, Calheta",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "3ª Taça da Madeira de Enduro e Mini Enduro - Globalgest",
            "event_date": date(2026, 7, 11),
            "location": "Fanal, Porto Moniz",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "51ª Volta à Madeira em Bicicleta",
            "event_date": date(2026, 7, 15),
            "location": "Madeira",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Campeonato da Madeira de DHU e Mini DHU - Brisa Sem Açúcar",
            "event_date": date(2026, 8, 22),
            "location": "Funchal",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Campeonato da Madeira de DHI e Mini-DHI - A Confeitaria",
            "event_date": date(2026, 9, 6),
            "location": "Camacha, Santa Cruz",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Campeonato da Madeira de Enduro e Mini Enduro - Globalgest",
            "event_date": date(2026, 9, 12),
            "location": "São Jorge, Santana",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Granfondo Calheta ADC Ponta do Pargo",
            "event_date": date(2026, 9, 20),
            "location": "Calheta",
            "url": ACMADEIRA_GRANFONDO_URL,
            "event_type": "cycling",
        },
        {
            "name": "4ª Taça da Madeira de XCO",
            "event_date": date(2026, 9, 27),
            "location": "Bica da Cana, Ponta do Sol",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Trans Madeira Autumn - Madeira Enduro",
            "event_date": date(2026, 9, 28),
            "location": "Madeira / Porto Santo",
            "url": TRANS_MADEIRA_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Bike Marathon Madeira",
            "event_date": date(2026, 10, 5),
            "location": "Funchal",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling",
        },
        {
            "name": "Campeonato da Madeira de CE - Brisa Sem Açúcar",
            "event_date": date(2026, 10, 11),
            "location": "São Vicente",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "2º Encontro de Escolas de CE - Brisa Sem Açúcar",
            "event_date": date(2026, 10, 11),
            "location": "São Vicente",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_kids",
        },
        {
            "name": "Campeonato da Madeira de XCO",
            "event_date": date(2026, 10, 25),
            "location": "Porto Santo",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "3º Encontro de Escolas de BTT",
            "event_date": date(2026, 10, 25),
            "location": "Porto Santo",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_kids",
        },
        {
            "name": "4ª Taça da Madeira de Enduro e Mini Enduro - Globalgest",
            "event_date": date(2026, 11, 7),
            "location": "Calheta",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "XVIII Edição da Avalanche Raposeira",
            "event_date": date(2026, 12, 6),
            "location": "Raposeira, Calheta",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling_pro",
        },
        {
            "name": "Passeio Luzes de Natal - A Confeitaria",
            "event_date": date(2026, 12, 12),
            "location": "Funchal",
            "url": ACMADEIRA_CALENDAR_URL,
            "event_type": "cycling",
        },
        {
            "name": "Rat Race Madeira Coast to Coast (bike/foot/kayak)",
            "event_date": date(2027, 5, 6),
            "location": "Madeira",
            "url": RAT_RACE_MADEIRA_URL,
            "event_type": "cycling",
        },
        {
            "name": "Volta à Madeira Classic Car Rally",
            "event_date": date(2026, 6, 26),
            "location": "Madeira",
            "url": CLASSIC_RALLY_URL,
            "event_type": "motorsport",
        },
        {
            "name": "Rali da Madeira / Madeira Wine Rally",
            "event_date": date(2026, 7, 30),
            "location": "Madeira",
            "url": RALI_MADEIRA_URL,
            "event_type": "motorsport",
        },
        {
            "name": "Eco Rally Madeira",
            "event_date": date(2026, 10, 3),
            "location": "Madeira",
            "url": ECO_RALLY_MADEIRA_URL,
            "event_type": "motorsport",
        },
        {
            "name": "Rally Madeira Legend",
            "event_date": date(2026, 10, 22),
            "location": "Madeira",
            "url": RALLY_MADEIRA_LEGEND_URL,
            "event_type": "motorsport",
        },
    ]
