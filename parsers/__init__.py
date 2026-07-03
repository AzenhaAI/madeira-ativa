from .atletismo import parse_atletismo
from .lap2go import parse_lap2go
from .swimrun import parse_swimrun
from .triatlo import parse_triatlo
from .racefinder import parse_racefinder
from .madeiraskyrunning import parse_madeiraskyrunning
from .official_sites import (
    parse_ecotrail_madeira,
    parse_funchal_sky_race,
    parse_official_sites,
    parse_ultra_x_madeira,
)
from .fpa import parse_fpa_competicoes
from .swimming_madeira import parse_swimming_madeira
from .aaram_trail_pdf import parse_aaram_trail_pdf
from .aaram_road_pdf import parse_aaram_road_pdf
from .madeira_festivals import parse_madeira_festivals
from .cycling_madeira import parse_cycling_madeira
from .aoram import parse_aoram

ALL_PARSERS = [
    ("atletismodamadeira.pt", parse_atletismo),
    ("AARAM Trail Madeira PDF", parse_aaram_trail_pdf),
    ("AARAM Madeira a Correr PDF", parse_aaram_road_pdf),
    ("VisitMadeira festivals", parse_madeira_festivals),
    ("ACMadeira cycling calendar", parse_cycling_madeira),
    ("AORAM orienteering calendar", parse_aoram),
    ("lap2go.com", parse_lap2go),
    ("swimrunportugal.com", parse_swimrun),
    ("triatlomadeira.com", parse_triatlo),
    ("racefinder.pt", parse_racefinder),
    ("madeiraskyrunning.com", parse_madeiraskyrunning),
    ("official race sites", parse_official_sites),
    ("ecotrailmadeira.com", parse_ecotrail_madeira),
    ("skyrunning.camadeira.com", parse_funchal_sky_race),
    ("ultra-x.co", parse_ultra_x_madeira),
    ("fpacompeticoes.pt", parse_fpa_competicoes),
    ("anatacaodamadeira.pt", parse_swimming_madeira),
]
