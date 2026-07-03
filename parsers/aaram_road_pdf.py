from datetime import date


PDF_URL = "https://atletismodamadeira.pt/wp-content/uploads/2026/05/MC-26_Quadro-v14.pdf"


def parse_aaram_road_pdf() -> list[dict]:
    events = [
        ("Corta-Mato das Feiteiras / C.R. Corta-Mato", date(2025, 11, 8), "5/7.5 km"),
        ("Sao Martinho", date(2025, 11, 10), "5.5 km"),
        ("G.P. Santa Luzia", date(2025, 11, 16), "3.4 km"),
        ("Circuito do Imaculado Coracao de Maria", date(2025, 11, 23), "3.8 km"),
        ("Milha Urbana do Funchal / C.R. Milha Estrada", date(2025, 11, 29), "1.609 m"),
        ("Camara de Lobos - Funchal / C.R. Estrada", date(2025, 12, 1), "9.4 km"),
        ("Porto Moniz", date(2025, 12, 8), "5.7 km"),
        ("Arca D'Ajuda", date(2025, 12, 21), "4.7 km"),
        ("G.P. dos Reis / C.R. Estrada", date(2026, 1, 4), "6.3 km"),
        ("G.P. de Natal", date(2026, 1, 7), "5.5 km"),
        ("Santo Amaro (Canico - Santa Cruz)", date(2026, 1, 10), "10.296 m"),
        ("Agua de Pena", date(2026, 1, 25), "5.1 km"),
        ("Nucleo Historico de Santa Maria Maior", date(2026, 2, 7), "6.1 km"),
        ("Estafeta Camara de Lobos - Funchal", date(2026, 2, 22), "9.4 km"),
        ("Quilometro Jovem", date(2026, 2, 28), "1.000 m"),
        ("Circuito do Livramento", date(2026, 3, 7), "5.5 km"),
        ("Corta-Mato Jovem e Escolar", date(2026, 3, 10), "1/1.5 km"),
        ("Cerejeiras", date(2026, 4, 12), "4.7 km"),
        ("Corrida de Sao Lourenco", date(2026, 4, 18), "4.1 km"),
        ("1 de Maio / C.R. Estrada", date(2026, 5, 1), "5.7 km"),
        ("Rota dos Dragoeiros", date(2026, 5, 3), "6.1 km"),
        ("Zona Militar da Madeira", date(2026, 5, 8), "5 km"),
        ("Nacional / Bioforma", date(2026, 5, 24), "5.2 km"),
        ("Meia Maratona da Calheta", date(2026, 5, 31), "21.0975 km"),
        ("Circuito do Canico", date(2026, 6, 7), "6.3 km"),
        ("Junta de Freguesia de Santo Antonio", date(2026, 6, 10), "6.5 km"),
        ("G.P. Santo da Serra", date(2026, 6, 13), "9.5 km"),
        ("Dia da Regiao", date(2026, 6, 28), "4.2 km"),
        ("Pontinha - Casa da Luz", date(2026, 7, 4), "2.443 m"),
        ("Horarios do Funchal", date(2026, 7, 12), "distance TBC"),
        ("Circuito de Sao Roque", date(2026, 7, 19), "8 km"),
        ("Santana - Ilha - Sao Jorge", date(2026, 7, 26), "14 km"),
        ("Corrida das Castanhas", date(2026, 8, 8), "4.5 km"),
        ("Art' Camacha", date(2026, 8, 16), "5.6 km"),
        ("G.P. Sao Vicente", date(2026, 8, 23), "7 km"),
        ("Madalena - Ponta do Sol", date(2026, 8, 30), "distance TBC"),
        ("GP Bombeiros", date(2026, 9, 6), "8.2 km"),
        ("Vindimas", date(2026, 9, 13), "4.7 km"),
        ("RG3", date(2026, 9, 26), "5.5 km"),
        ("Corrida Regional dos Professores", date(2025, 11, 1), "3.5 km"),
        ("Meia Maratona do Porto Santo - CR", date(2026, 3, 14), "21.0975 km"),
        ("Corrida da UMa - Dia do Estudante", date(2026, 3, 24), "5 km"),
        ("Corrida da Hora do Planeta", date(2026, 3, 28), "2 km"),
        ("Corrida da Liberdade (Santa Cruz-Machico)", date(2026, 4, 25), "7.5 km"),
        ("Caminho de Ferro", date(2026, 5, 10), "1/2.5/3.9 km"),
        ("Circuito do Estabelecimento Prisional do Funchal", date(2026, 6, 18), "3.3 km"),
        ("Corrida Solidaria AFA", date(2026, 7, 5), "5.3 km"),
        ("Milha do Dia do Porto / CR Milha", date(2026, 7, 18), "1.609 m"),
        ("Circuito da Festa do Pero", date(2026, 9, 20), "distance TBC"),
        ("Corrida do Aeroporto", date(2026, 9, 27), "6 km"),
    ]

    return [
        {
            "name": f"{name} ({distance})",
            "event_date": event_date,
            "location": "Madeira",
            "url": PDF_URL,
            "event_type": "road_run",
        }
        for name, event_date, distance in events
    ]
