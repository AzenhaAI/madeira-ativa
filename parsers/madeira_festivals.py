from datetime import date


CALENDAR_URL = "https://visitmadeira.com/media/1knpekh3/calendario-animacao-turistica_-srtc-drt_-en_2026-2028.pdf"
EVENTS_MADEIRA_SANTA_CRUZ_URL = "https://eventsmadeira.com/en/location/santa-cruz-en/?post_type=event"
ONION_FESTIVAL_URL = "https://www.jf-canico.pt/autarquia/noticias/523-festa_da_cebola_2026"
ATLANTIC_FESTIVAL_URL = "https://eventsmadeira.com/en/event/atlantic-festival/"
FIREWORKS_CONTEST_URL = "https://eventsmadeira.com/en/event/atlantic-festival/"
ATLANTIC_ROOTS_URL = "https://www.islandsevents.com/island/madeira/atlantic-roots-festival-2026"
FESTIVALS = [
    ("Carnival Festivities", date(2026, 2, 11), "Funchal, Madeira"),
    ("Madeira Flower Festival", date(2026, 4, 30), "Funchal, Madeira"),
    ("Atlantic Festival", date(2026, 6, 5), "Funchal, Madeira"),
    ("Classics at Magnolia", date(2026, 7, 25), "Funchal, Madeira"),
    ("Madeira Wine Festival", date(2026, 8, 23), "Madeira"),
    ("European Folklore Week", date(2026, 8, 23), "Madeira"),
    ("Columbus Festival - Porto Santo Island", date(2026, 9, 17), "Porto Santo, Madeira"),
    ("Madeira Nature Festival", date(2026, 10, 6), "Madeira"),
    ("Christmas and End of the Year Festivities", date(2026, 12, 1), "Funchal, Madeira"),
    ("New Year's Eve Firework Display", date(2026, 12, 31), "Funchal, Madeira"),
    ("Carnival Festivities", date(2027, 2, 3), "Funchal, Madeira"),
    ("Madeira Flower Festival", date(2027, 4, 29), "Funchal, Madeira"),
    ("Atlantic Festival", date(2027, 6, 4), "Funchal, Madeira"),
    ("Classics at Magnolia", date(2027, 7, 31), "Funchal, Madeira"),
    ("Madeira Wine Festival", date(2027, 8, 22), "Madeira"),
    ("European Folklore Week", date(2027, 8, 22), "Madeira"),
    ("Columbus Festival - Porto Santo Island", date(2027, 9, 23), "Porto Santo, Madeira"),
    ("Madeira Nature Festival", date(2027, 10, 5), "Madeira"),
    ("Christmas and End of the Year Festivities", date(2027, 12, 1), "Funchal, Madeira"),
    ("New Year's Eve Firework Display", date(2027, 12, 31), "Funchal, Madeira"),
    ("Carnival Festivities", date(2028, 2, 23), "Funchal, Madeira"),
    ("Madeira Flower Festival", date(2028, 5, 4), "Funchal, Madeira"),
    ("Atlantic Festival", date(2028, 6, 3), "Funchal, Madeira"),
    ("Classics at Magnolia", date(2028, 8, 29), "Funchal, Madeira"),
    ("Madeira Wine Festival", date(2028, 8, 20), "Madeira"),
    ("European Folklore Week", date(2028, 8, 20), "Madeira"),
    ("Columbus Festival - Porto Santo Island", date(2028, 9, 21), "Porto Santo, Madeira"),
    ("Madeira Nature Festival", date(2028, 10, 3), "Madeira"),
    ("Christmas and End of the Year Festivities", date(2028, 12, 1), "Funchal, Madeira"),
    ("New Year's Eve Firework Display", date(2028, 12, 31), "Funchal, Madeira"),
]

SANTA_CRUZ_EVENTS = [
    (
        "Festa da Cebola / Onion Festival",
        date(2026, 5, 15),
        "Centro do Canico, Santa Cruz",
        ONION_FESTIVAL_URL,
    ),
    (
        "CMAS Underwater Photography and Video World Cup",
        date(2026, 6, 22),
        "Santa Cruz / Funchal",
        EVENTS_MADEIRA_SANTA_CRUZ_URL,
    ),
    (
        "Ethnographic display Camacha de Ontem - Madeira de Sempre",
        date(2026, 7, 11),
        "Largo da Achada, Camacha, Santa Cruz",
        "https://eventsmadeira.com/en/event/ethnographic-display-camacha-de-ontem-madeira-de-sempre-yesterdays-camacha-all-time-madeira/",
    ),
    (
        "Art' Camacha",
        date(2026, 8, 7),
        "Camacha, Santa Cruz",
        "https://eventsmadeira.com/en/event/art-camacha/",
    ),
    (
        "XXXIX Apple Festival",
        date(2026, 10, 2),
        "Camacha, Santa Cruz",
        "https://eventsmadeira.com/en/event/xxxix-apple-festival/",
    ),
    (
        "100 Miles - Historic Rally",
        date(2026, 10, 10),
        "Santa Cruz / Machico",
        EVENTS_MADEIRA_SANTA_CRUZ_URL,
    ),
    (
        "Carnival in Santa Cruz",
        date(2027, 2, 3),
        "Santa Cruz",
        EVENTS_MADEIRA_SANTA_CRUZ_URL,
    ),
]

ATLANTIC_EVENTS = [
    (
        "Atlantic Fireworks Contest: Canada - A Fronteira Final - 22:30",
        date(2026, 6, 6),
        "Cais do Funchal",
        FIREWORKS_CONTEST_URL,
    ),
    (
        "Atlantic Fireworks Contest: China - Flores em Chamas: O Desabrochar da Luz - 22:30",
        date(2026, 6, 13),
        "Cais do Funchal",
        FIREWORKS_CONTEST_URL,
    ),
    (
        "Atlantic Fireworks Contest: Ukraine - Magia do Atlântico: Uma Ponte Sobre o Oceano - 22:30",
        date(2026, 6, 20),
        "Cais do Funchal",
        FIREWORKS_CONTEST_URL,
    ),
    (
        "Atlantic Atlantic Roots Festival",
        date(2026, 6, 15),
        "Praça do Povo, Funchal",
        ATLANTIC_ROOTS_URL,
    ),
]

ATLANTIC_PROGRAM_EVENTS = [
    (
        "Atlantic Sunset: Hot Stuff concert - 17:00",
        date(2026, 6, 5),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: DJ WAGA - 22:30",
        date(2026, 6, 5),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic DOC: Naturalistas de Vulto I - 21:30",
        date(2026, 6, 5),
        "Cais da Ponta do Sol",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Pyromusical Show: Macedo's Pirotecnia - Gerações - 23:00",
        date(2026, 6, 5),
        "Machico",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Miguel Pires Trio concert - 17:00",
        date(2026, 6, 6),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: DJ SIL & Sax Vibes by Basílio Abreu - 23:00",
        date(2026, 6, 6),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Ópera no Pico: Cinema Paraíso - 21:00",
        date(2026, 6, 6),
        "Fortaleza do Pico, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: André Abrantes concert - 17:00",
        date(2026, 6, 7),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Joaquim Machado concert - 17:00",
        date(2026, 6, 11),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Festival Raízes do Atlântico: Entre Ilhas - 20:00",
        date(2026, 6, 11),
        "Parque de Santa Catarina, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Festival Raízes do Atlântico: Seara - 21:30",
        date(2026, 6, 11),
        "Parque de Santa Catarina, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Rocky Shore Melodies concert - 17:00",
        date(2026, 6, 12),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: DJ WAGA - 22:30",
        date(2026, 6, 12),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Festival Raízes do Atlântico: Xarabanda - 20:00",
        date(2026, 6, 12),
        "Parque de Santa Catarina, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Festival Raízes do Atlântico: El Pony Pisador - 21:30",
        date(2026, 6, 12),
        "Parque de Santa Catarina, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic DOC: Naturalistas de Vulto II - 21:30",
        date(2026, 6, 12),
        "Piscinas Naturais do Porto Moniz",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Carla Rojas Belizario concert - 17:00",
        date(2026, 6, 13),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: DJ Daniel Caires - 23:00",
        date(2026, 6, 13),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Ópera no Pico: Amores Impossíveis - 21:00",
        date(2026, 6, 13),
        "Fortaleza do Pico, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Festival Raízes do Atlântico: Cordophonia - 21:00",
        date(2026, 6, 13),
        "Parque de Santa Catarina, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Festival Raízes do Atlântico: Bonga & Orquestra de Jazz da Madeira - 23:00",
        date(2026, 6, 13),
        "Parque de Santa Catarina, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: ONE+1 concert - 17:00",
        date(2026, 6, 14),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: NuLo concert - 17:00",
        date(2026, 6, 18),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Gold Label concert - 17:00",
        date(2026, 6, 19),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: DJ WAGA - 22:30",
        date(2026, 6, 19),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic DOC: Naturalistas de Vulto III - 21:30",
        date(2026, 6, 19),
        "Casa da Cultura de Santa Cruz (Quinta do Revoredo)",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Black Dogs Blues Band concert - 17:00",
        date(2026, 6, 20),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: DJ Ameriko Nunez - 23:00",
        date(2026, 6, 20),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Ópera no Pico: Ópera, Amor e Confusão - 21:00",
        date(2026, 6, 20),
        "Fortaleza do Pico, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Ópera no Pico: A História Encantada da Flauta Mágica - 11:00",
        date(2026, 6, 21),
        "Fortaleza do Pico, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: J's & the Queen concert - 17:00",
        date(2026, 6, 21),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Pyromusical Closing Show: Macedo's Pirotecnia - Gerações - 23:59",
        date(2026, 6, 23),
        "Cais antigo da cidade de Vila Baleira, Porto Santo",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Sharp Knives concert - 17:00",
        date(2026, 6, 25),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Maya Blandy concert - 17:00",
        date(2026, 6, 26),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Circus Arts: (Al)Mare - Where Life Moves Like Water (26/06-28/06) - 21:30",
        date(2026, 6, 26),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic DOC: Gunther Maul - 21:30",
        date(2026, 6, 26),
        "Cais do Carvão, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Énia Caires concert - 17:00",
        date(2026, 6, 27),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Ópera no Pico: Trio Uirapuru - Canção em Viagem - 21:00",
        date(2026, 6, 27),
        "Fortaleza do Pico, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Closing Pyromusical Show: Gerações - 22:30",
        date(2026, 6, 27),
        "Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Atlantic Sunset: Juan & Friends concert - 17:00",
        date(2026, 6, 28),
        "Praça do Povo, Funchal",
        CALENDAR_URL,
        "festival",
    ),
]

CULTURE_EVENTS = [
    (
        "Tuna Route Festival",
        date(2026, 6, 3),
        "Porto Santo",
        "https://eventsmadeira.com/en/event/tuna-route-festival/",
        "festival",
    ),
    (
        "Sixteenth Century Market",
        date(2026, 6, 5),
        "Machico",
        "https://eventsmadeira.com/en/event/sixteenth-century-market/",
        "festival",
    ),
    (
        "Soup Fair",
        date(2026, 6, 13),
        "Boaventura, Santana",
        "https://eventsmadeira.com/en/event/soup-fair/",
        "festival",
    ),
    (
        "Cherry's Fest",
        date(2026, 6, 19),
        "Jardim da Serra, Câmara de Lobos",
        "https://eventsmadeira.com/en/event/cherrys-fest/",
        "festival",
    ),
    (
        "Christmas Village",
        date(2026, 12, 4),
        "Funchal",
        "https://eventsmadeira.com/en/event/christmas-village/",
        "children",
    ),
    (
        "Christmas Market",
        date(2026, 12, 1),
        "Funchal",
        "https://eventsmadeira.com/en/event/christmas-market/",
        "festival",
    ),
    (
        "Ethnographic Village",
        date(2026, 12, 1),
        "Funchal",
        "https://eventsmadeira.com/en/event/ethnographic-village/",
        "festival",
    ),
    (
        "Childbirth Masses (Missas do Parto)",
        date(2026, 12, 15),
        "Madeira",
        "https://eventsmadeira.com/en/event/childbirth-masses-missas-do-parto/",
        "festival",
    ),
    (
        "Market Night",
        date(2026, 12, 23),
        "Funchal",
        "https://www.madeira-web.com/en/whats-on/madeira-events.html",
        "festival",
    ),
    (
        "Regional Arts Week: Exhibition Clay Dolls (25/05-12/06)",
        date(2026, 6, 6),
        "Espaço EntreArte SRE, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Regional Exhibition of Plastic Expression Banana Parade (04/06-21/06)",
        date(2026, 6, 6),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week (08/06-13/06)",
        date(2026, 6, 8),
        "Avenida Arriaga and Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Exhibition Socks That Tell Stories (08/06-21/06)",
        date(2026, 6, 8),
        "Casa da Luz Museum, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Exhibition Treasures of My Homeland Flowers (08/06-21/06)",
        date(2026, 6, 8),
        "MadeiraShopping, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Festa no Jardim - 10:30",
        date(2026, 6, 8),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Movin'Art Madeira - 18:00",
        date(2026, 6, 8),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: SRA2026 Opening Show - 21:00",
        date(2026, 6, 8),
        "Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Traditional Madeiran String Instruments Performance - 10:30",
        date(2026, 6, 9),
        "Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Traditional Madeiran String Instruments and Charamelas Group - 12:00",
        date(2026, 6, 9),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Instrumental Artistic Modality Performance - 15:00",
        date(2026, 6, 9),
        "Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Conservatory Guitar Ensemble - 18:00",
        date(2026, 6, 9),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Choral Singing Artistic Modality Performance - 10:30",
        date(2026, 6, 11),
        "Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Dramatic Expression Artistic Modality Performance - 10:30",
        date(2026, 6, 11),
        "Centro Social e Paroquial do Imaculado Coração de Maria, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: 1st Meeting of Madeiran Musicians - 12:00",
        date(2026, 6, 11),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Rock Bands Artistic Modality Performance I - 15:00",
        date(2026, 6, 11),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Rock Bands Artistic Modality Performance II - 16:00",
        date(2026, 6, 11),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Dance Artistic Modality Performance - 10:30",
        date(2026, 6, 12),
        "Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Choral Singing Performance - 12:00",
        date(2026, 6, 12),
        "Avenida Arriaga, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: 6th Children's Festival Voices from Our School - Prestige Dance - 18:00",
        date(2026, 6, 12),
        "Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: Exhibition Banana (12/06-26/06)",
        date(2026, 6, 12),
        "Espaço EntreArte SRE, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Regional Arts Week: 5th Youth Festival Voices from Our School - Closing Show - Prestige Dance - 21:00",
        date(2026, 6, 13),
        "Jardim Municipal Auditorium, Funchal",
        CALENDAR_URL,
        "festival",
    ),
    (
        "Funchal Jazz Festival (09/07-11/07): Duarte Ventura Quintet + Joel Ross Good Vibes; Immanuel Wilkins Quartet + Joe Lovano & Antonio Faraò Explorations; Ledisi + Jason Moran & Orquestra de Jazz do Funchal play Duke Ellington - 21:30",
        date(2026, 7, 9),
        "Parque de Santa Catarina, Funchal",
        "https://www.funchal.pt/",
        "festival",
    ),
]


def parse_madeira_festivals() -> list[dict]:
    events = [
        {
            "name": name,
            "event_date": event_date,
            "location": location,
            "url": CALENDAR_URL,
            "event_type": "festival",
        }
        for name, event_date, location in FESTIVALS
    ]

    events.extend([
        {
            "name": name,
            "event_date": event_date,
            "location": location,
            "url": url,
            "event_type": "festival",
        }
        for name, event_date, location, url in SANTA_CRUZ_EVENTS
    ])

    events.extend([
        {
            "name": name,
            "event_date": event_date,
            "location": location,
            "url": url,
            "event_type": "festival",
        }
        for name, event_date, location, url in ATLANTIC_EVENTS
    ])

    events.extend([
        {
            "name": name,
            "event_date": event_date,
            "location": location,
            "url": url,
            "event_type": event_type,
        }
        for name, event_date, location, url, event_type in ATLANTIC_PROGRAM_EVENTS
    ])

    events.extend([
        {
            "name": name,
            "event_date": event_date,
            "location": location,
            "url": url,
            "event_type": event_type,
        }
        for name, event_date, location, url, event_type in CULTURE_EVENTS
    ])

    return events
