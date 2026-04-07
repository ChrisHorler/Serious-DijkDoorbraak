import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Roles ────────────────────────────────────────────────────────────────────

const roles = [
  {
    name: "Officier van Dienst Politie",
    shortName: "OvD-P",
    description:
      "Je vertegenwoordigt de politie in het ROT en zorgt voor openbare orde en veiligheid tijdens de crisis.",
    briefing:
      "Jij bent de ogen en oren van de politie in het ROT. Je zorgt dat het crisisgebied veilig blijft en dat evacuaties ordelijk verlopen.\n\n" +
      "Jouw taken:\n" +
      "• Politie-eenheden inzetten en aansturen\n" +
      "• Afzettingen plaatsen en veiligheidszones creëren\n" +
      "• Verkeersstromen begeleiden bij evacuatie\n" +
      "• Openbare orde handhaven (voorkomen van plunderingen)\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Mensen weigeren te evacueren — wat doe je?\n" +
      "• Wegen raken geblokkeerd door verkeer\n" +
      "• Leegstaande wijken trekken plunderaars aan\n\n" +
      "Let op: Is evacuatie veilig en uitvoerbaar? Moeten gebieden worden afgesloten?",
    abilities: [
      { name: "Politie-eenheden inzetten", description: "Zet extra politie-eenheden in op een specifieke locatie in het crisisgebied." },
      { name: "Afzetting plaatsen", description: "Stel een politieafzetting in rondom een gevaarlijk of gevoelig gebied." },
      { name: "Evacuatie ondersteunen", description: "Stuur politie-eenheden om bewoners te begeleiden bij de evacuatie." },
      { name: "Verkeersstromen begeleiden", description: "Organiseer verkeersregelaars op kritieke punten voor vloeiende evacuatieroutes." },
      { name: "Openbare orde handhaven", description: "Ga over tot handhaving van openbare orde in een aangewezen gebied." },
    ],
  },
  {
    name: "Officier van Dienst Brandweer",
    shortName: "OvD-B",
    description:
      "Je bent verantwoordelijk voor incidentbestrijding en reddingsoperaties.",
    briefing:
      "Jij leidt de brandweerinzet in het ROT. Je besluit waar geredde moet worden en of het veilig is voor hulpverleners.\n\n" +
      "Jouw taken:\n" +
      "• Brandweerploegen en materieel inzetten\n" +
      "• Besluiten over reddingsoperaties\n" +
      "• Adviseren over veiligheid van dijken, gebouwen en infrastructuur\n" +
      "• Specialistische teams inzetten (bijv. waterredding)\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Hulpdiensten inzetten terwijl het gebied onveilig wordt\n" +
      "• Reddingsacties vs. eigen veiligheid van hulpverleners\n\n" +
      "Let op: Waar is redding het meest urgent? Zijn er gevaarlijke situaties voor hulpverleners?",
    abilities: [
      { name: "Brandweerploegen inzetten", description: "Zet brandweerteams in op een specifieke locatie voor reddingsoperaties of waterbeheer." },
      { name: "Reddingsoperatie starten", description: "Start een actieve reddingsoperatie voor inwoners in nood op een opgegeven locatie." },
      { name: "Waterreddingsteam inzetten", description: "Stuur specialisten waterredding met boten naar een watergebied." },
      { name: "Veiligheid infrastructuur beoordelen", description: "Voer een veiligheidsinspectie uit op een dijk, brug of gebouw." },
      { name: "Gevaarlijke situatie melden", description: "Meld een acuut gevaarlijke situatie aan het ROT en adviseer over mogelijke maatregelen." },
    ],
  },
  {
    name: "GHOR",
    shortName: "GHOR",
    description:
      "Je coördineert de medische hulpverlening tijdens de dijkdoorbraak.",
    briefing:
      "Jij bent verantwoordelijk voor alle medische hulp tijdens de crisis. Van ambulances tot ziekenhuiscapaciteit — jij houdt het overzicht.\n\n" +
      "Jouw taken:\n" +
      "• Ambulances en medische teams inzetten\n" +
      "• Ziekenhuizen informeren over mogelijke slachtoffers\n" +
      "• Afstemmen met ziekenhuis over opnamecapaciteit\n" +
      "• Medische opvang regelen bij evacuaties\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Beperkte ziekenhuiscapaciteit terwijl slachtoffers toenemen\n" +
      "• Evacuatie van zorginstellingen (verpleeghuizen, ziekenhuizen)\n\n" +
      "Let op: Hoeveel slachtoffers worden verwacht? Is de medische capaciteit voldoende?",
    abilities: [
      { name: "Ambulances inzetten", description: "Stuur ambulances naar een locatie met gewonden of kwetsbare personen." },
      { name: "Ziekenhuis informeren", description: "Informeer een ziekenhuis over het verwachte aantal slachtoffers en de aard van de verwondingen." },
      { name: "Medische opvang regelen", description: "Richt een medische opvangpost in op een opgegeven locatie." },
      { name: "Zorginstelling evacueren", description: "Coördineer de evacuatie van een zorginstelling (verpleeghuis of ziekenhuis)." },
      { name: "Gezondheidsrisico melden", description: "Meld een gezondheidsrisico (bijv. vervuild water, besmetting) aan het ROT." },
    ],
  },
  {
    name: "Bevolkingszorg",
    shortName: "BZ",
    description:
      "Je bent verantwoordelijk voor de zorg voor inwoners die getroffen zijn door de dijkdoorbraak.",
    briefing:
      "Jij zorgt dat geëvacueerde bewoners een veilige plek hebben en dat hun basisbehoeften worden vervuld.\n\n" +
      "Jouw taken:\n" +
      "• Opvanglocaties inrichten voor geëvacueerde inwoners\n" +
      "• Noodvoorzieningen organiseren (eten, slapen)\n" +
      "• Geëvacueerde burgers registreren\n" +
      "• Gemeentelijke hulpdiensten coördineren\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Te weinig opvangplekken voor het aantal geëvacueerden\n" +
      "• Onzekerheid over hoe lang mensen weg moeten blijven\n\n" +
      "Let op: Hebben inwoners een veilige plek? Hoe organiseer je opvang voor grote groepen?",
    abilities: [
      { name: "Opvanglocatie inrichten", description: "Activeer en richt een opvanglocatie in voor geëvacueerde inwoners op een opgegeven locatie." },
      { name: "Noodvoorzieningen organiseren", description: "Regel eten, drinken en slaapgelegenheid voor geëvacueerde bewoners." },
      { name: "Burgers registreren", description: "Start de registratie van geëvacueerde burgers op een opgegeven opvanglocatie." },
      { name: "Extra opvangcapaciteit aanvragen", description: "Vraag extra opvangcapaciteit aan bij een andere gemeente of organisatie." },
      { name: "Hulpdiensten coördineren", description: "Coördineer gemeentelijke hulpdiensten op een specifieke locatie." },
    ],
  },
  {
    name: "Communicatie",
    shortName: "COM",
    description:
      "Je zorgt voor duidelijke communicatie naar inwoners en media tijdens de dijkdoorbraak.",
    briefing:
      "Jij bepaalt wat inwoners en media te horen krijgen en wanneer. Jouw woorden kunnen paniek voorkomen — of veroorzaken.\n\n" +
      "Jouw taken:\n" +
      "• NL-Alerts en persberichten opstellen\n" +
      "• Informatie publiceren via verschillende kanalen\n" +
      "• Advies geven over communicatie naar burgers\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Hoe communiceer je als nog niet alles zeker is?\n" +
      "• Hoe voorkom je paniek terwijl je transparant bent?\n\n" +
      "Let op: Wat moeten inwoners NU weten? Is de boodschap duidelijk en betrouwbaar?",
    abilities: [
      { name: "NL-Alert versturen", description: "Verstuur een NL-Alert naar alle mobiele telefoons in het getroffen gebied." },
      { name: "Persbericht opstellen", description: "Stel een persbericht op en verstuur dit naar de media." },
      { name: "Sociale media update plaatsen", description: "Publiceer een update op sociale media namens de crisisorganisatie." },
      { name: "Misinformatie corrigeren", description: "Reageer actief op onjuiste informatie die circuleert op sociale media of in de pers." },
      { name: "Burgercommunicatie adviseren", description: "Geef het ROT advies over de boodschap richting inwoners in deze fase van de crisis." },
    ],
  },
  {
    name: "Defensie",
    shortName: "DEF",
    description:
      "Je vertegenwoordigt Defensie en biedt extra capaciteit aan de crisisorganisatie.",
    briefing:
      "Defensie kan veel, maar wordt pas ingezet na een officiële aanvraag via de civiele autoriteiten. Jij bewaakt die afweging.\n\n" +
      "Jouw taken:\n" +
      "• Militaire ondersteuning inzetten na aanvraag via civiele autoriteiten\n" +
      "• Personeel en materieel beschikbaar stellen\n" +
      "• Transport en logistieke ondersteuning bieden\n" +
      "• Helikopters en boten inzetten indien nodig\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Waar is militaire inzet het meest nodig?\n" +
      "• Inzet kost tijd: een viertonner kost al gauw vier uur.\n\n" +
      "Let op: Waar kunnen militairen de hulpdiensten het meest versterken?",
    abilities: [
      { name: "Militaire ondersteuning aanvragen", description: "Dien een formele aanvraag in voor militaire bijstand op een specifieke locatie." },
      { name: "Personeel beschikbaar stellen", description: "Stel militair personeel ter beschikking voor een evacuatie- of reddingstaak." },
      { name: "Transport inzetten", description: "Zet militair transportmaterieel (viertonners, boten) in voor logistieke ondersteuning." },
      { name: "Helikopter inzetten", description: "Coördineer een helikopterinzet voor verkenning of reddingsoperatie." },
      { name: "Defensiecapaciteit rapporteren", description: "Rapporteer aan het ROT welke militaire middelen beschikbaar zijn en op welke termijn." },
    ],
  },
  {
    name: "Operationeel Leider",
    shortName: "ROL",
    description:
      "Je bent voorzitter van het ROT en stuurt de crisisbestrijding aan.",
    briefing:
      "Jij leidt het ROT. Alle informatie komt bij jou samen en jij bewaakt het BOB-proces: eerst beeldvormen, dan oordelen, dan besluiten.\n\n" +
      "Jouw taken:\n" +
      "• Leiding geven aan het Regionaal Operationeel Team\n" +
      "• Prioriteiten stellen en besluiten nemen over de crisisaanpak\n" +
      "• Coördineren van de inzet van hulpdiensten\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Wanneer schaal je op naar een hoger GRIP-niveau?\n" +
      "• Wat heeft prioriteit: dijkversterking of evacuatie?\n\n" +
      "Let op: Werken alle diensten goed samen? Wat is de grootste dreiging op dit moment?",
    abilities: [
      { name: "Opschalen naar hoger GRIP-niveau", description: "Besluit tot opschaling naar een hoger GRIP-niveau en informeer alle betrokkenen." },
      { name: "Evacuatiebesluit nemen", description: "Neem een formeel besluit tot (gedeeltelijke) evacuatie van een aangewezen gebied." },
      { name: "Prioriteit stellen", description: "Stel formeel vast welke taak of locatie op dit moment de hoogste prioriteit heeft." },
      { name: "Diensten coördineren", description: "Geef een directe coördinatieopdracht aan meerdere diensten tegelijkertijd." },
      { name: "Bijstandsaanvraag indienen", description: "Dien een formele bijstandsaanvraag in bij een andere veiligheidsregio of het Rijk." },
    ],
  },
  {
    name: "Rijkswaterstaat",
    shortName: "RWS",
    description:
      "Je bent verantwoordelijk voor infrastructuur en waterbeheer op rijksniveau.",
    briefing:
      "Jij bent de expert op het gebied van water en infrastructuur. Jouw informatie is cruciaal voor de beslissingen van het ROT.\n\n" +
      "Jouw taken:\n" +
      "• Waterstanden monitoren en rapporteren\n" +
      "• Beheer en afsluiting van snelwegen, tunnels en bruggen\n" +
      "• Maatregelen voor waterbeheer en infrastructuur inzetten\n" +
      "• Adviseren over waterstromen en overstromingsrisico's\n\n" +
      "Dilemma's die je kunt tegenkomen:\n" +
      "• Wegen afsluiten of openhouden voor evacuatie?\n" +
      "• Welke infrastructuur moet beschermd worden?\n\n" +
      "Let op: Vertaal technische informatie naar begrijpelijke taal voor de burgemeester en hulpdiensten.",
    abilities: [
      { name: "Waterstand rapporteren", description: "Breng het ROT op de hoogte van de actuele waterstanden en verwachte ontwikkeling." },
      { name: "Weg of tunnel afsluiten", description: "Sluit een specifieke weg, tunnel of brug af vanwege overstromingsgevaar." },
      { name: "Waterbeheermaatregel inzetten", description: "Activeer een waterbeheermaatregel (bijv. gemaal, sluis, bergingsgebied)." },
      { name: "Overstromingsrisico adviseren", description: "Geef het ROT een advies over het overstromingsrisico in een specifiek gebied." },
      { name: "Infrastructuur beschermen", description: "Neem maatregelen om kritieke infrastructuur (stroomstation, waterleiding) te beschermen." },
    ],
  },
];

// ─── Scenario ─────────────────────────────────────────────────────────────────

// Location: Maasdijk near Blerick, Noord-Limburg — fictional town "Limborgum"
const INCIDENT_LAT = 51.3739;
const INCIDENT_LNG = 6.1105;

const SCENARIO_ID = "00000000-0000-0000-0000-000000000001";

// Key locations in Limborgum — pre-placed as custom overlays on the map
const customOverlays = [
  {
    id: "overlay-ziekenhuis",
    type: "custom",
    label: "Ziekenhuis & Zorgcentrum Limborgum",
    color: "#ef4444",
    kind: "marker",
    coordinates: [51.3892, 6.1281],
    icon: "🏥",
  },
  {
    id: "overlay-basisschool",
    type: "custom",
    label: "Basisschool Limborgum",
    color: "#f59e0b",
    kind: "marker",
    coordinates: [51.3825, 6.1345],
    icon: "🏫",
  },
  {
    id: "overlay-middelbare-school",
    type: "custom",
    label: "Middelbare School Limborgum",
    color: "#f59e0b",
    kind: "marker",
    coordinates: [51.3862, 6.1228],
    icon: "🎓",
  },
  {
    id: "overlay-centrum",
    type: "custom",
    label: "Historisch Stadscentrum Limborgum",
    color: "#8b5cf6",
    kind: "marker",
    coordinates: [51.3758, 6.1389],
    icon: "🏛️",
  },
];

const scenarioData = {
  title: "Dijkdoorbraak Limborgum",
  description:
    "Het stadje Limborgum in Zuid-Limburg ligt al eeuwen beschut achter haar dijken aan de rivier. In de stad liggen een ziekenhuis met zorgcentrum (ouderen en revaliderende patiënten), een school voor basis- en middelbaar onderwijs en een historisch stadscentrum. Na drie dagen van extreme neerslag — KNMI code oranje — staat de rivier gevaarlijk hoog. Om 14:28 constateren dijkinspecteurs van het waterschap wellen aan de landzijde van de dijk: water borrelt omhoog uit de grond. Dit is het moment dat de crisis begint. Het ROT wordt geactiveerd op GRIP 2. De nacht daarna escaleert de situatie verder naar GRIP 3 en uiteindelijk breekt de dijk door.",
  incidentLat: INCIDENT_LAT,
  incidentLng: INCIDENT_LNG,
  phases: [
    {
      id: "phase-1",
      name: "Fase 1 — GRIP 2: Acute dreiging",
      floodZoneScale: 0.5,
      activeOverlayIds: [],
      injectId: null,
    },
    {
      id: "phase-2",
      name: "Fase 2 — GRIP 3: Dijkdoorbraak (03:56)",
      floodZoneScale: 1.0,
      activeOverlayIds: [],
      injectId: null,
    },
    {
      id: "phase-3",
      name: "Fase 3 — GRIP 3: Escalatie & neveneffecten",
      floodZoneScale: 1.8,
      activeOverlayIds: [],
      injectId: null,
    },
  ],
};

// ─── Injects ──────────────────────────────────────────────────────────────────
// Based on the crisis timeline from "fasen van de crisis":
// 14:28 — Wellen geconstateerd → game start (GRIP 2)
// 21:02 — Acute dreiging, zandzakken onvoldoende → BESLISMOMENT 2 (GRIP 3)
// 03:56 — Dijkdoorbraak → water stroomt woonwijk binnen
// Dag 1-3 — Escalatie: brug, chemisch lek, plunderingen

const injects = [
  // ── Fase 1: GRIP 2 — Acute dreiging ────────────────────────────────────────
  {
    title: "14:28 — Wellen geconstateerd | GRIP 2 actief",
    content:
      "Dijkinspecteurs van het waterschap constateren wellen op meerdere plekken aan de landzijde van de Maasdijk. Water borrelt omhoog uit de grond — het waterdrukverschil is gevaarlijk groot. Zandzakkenploegen zijn ingezet. De Veiligheidsregio Limburg heeft GRIP 2 afgekondigd. Het ROT is geactiveerd.\n\nBeginsituatie: wat weten we? Wat hebben we nog nodig? Wie doet wat?",
    triggerTime: 60,
    targetRole: null,
  },
  {
    title: "15:15 — Eerste evacuatieadvies laaggelegen gebieden",
    content:
      "De burgemeester van Limborgum geeft een evacuatieadvies af voor de laaggelegen wijken direct achter de dijk. Het gaat nog om een advies, niet om een verplichting. Sommige bewoners vertrekken, anderen blijven. Op sociale media ontstaat discussie: 'Is dit echt nodig?'\n\nCommunicatie: wat wordt er gecommuniceerd naar de bevolking? Via welke kanalen?",
    triggerTime: 300,
    targetRole: "COM",
  },
  {
    title: "16:40 — Zandzakken onvoldoende | Waterstand stijgt door",
    content:
      "Rijkswaterstaat meldt dat de waterstand sneller stijgt dan de modellen voorspelden. De zandzakken op de zwakste dijkvakken zijn niet voldoende. Extra materiaal is onderweg maar komt pas over twee uur aan. De prognose: de dijk houdt het maximaal tot morgenochtend.\n\nRWS: welk advies geef je het ROT? Wat kan er nog gedaan worden aan de dijk?",
    triggerTime: 600,
    targetRole: "RWS",
  },
  {
    title: "17:30 — Ziekenhuis & zorgcentrum: evacuatie overwegen",
    content:
      "Het ziekenhuis en het aangrenzende zorgcentrum in Limborgum liggen in de potentiële overstromingszone. Het zorgcentrum heeft 90 bewoners, van wie 35 bedlegerig zijn. Het ziekenhuis heeft 12 IC-patiënten. Evacuatie kost veel tijd en is medisch riskant. Niet evacueren is ook riskant als het water komt.\n\nGHOR: hoeveel slachtoffers worden verwacht? Is medische capaciteit elders beschikbaar?",
    triggerTime: 900,
    targetRole: "GHOR",
  },
  {
    title: "18:45 — Scholen lopen leeg, chaos op de wegen",
    content:
      "Ouders halen massaal hun kinderen op van de basisschool en middelbare school in Limborgum. Dit veroorzaakt verkeerschaos op de evacuatieroutes. Tegelijkertijd proberen hulpdiensten diezelfde wegen te gebruiken. De scholen zijn inmiddels leeg maar het verkeer staat vast.\n\nOvD-P: hoe regel je de verkeersstromen? Moeten wegen worden afgesloten of juist vrijgehouden?",
    triggerTime: 1200,
    targetRole: "OvD-P",
  },
  {
    title: "21:02 — BESLISMOMENT: Geforceerde evacuatie & GRIP 3",
    content:
      "De situatie is niet meer beheersbaar op GRIP 2 niveau. De burgemeester overweegt een verplicht evacuatiebevel voor de gehele risicozone. Dit raakt circa 4.200 inwoners. Tegelijkertijd wordt opschaling naar GRIP 3 overwogen — de Commissaris van de Koning wordt geïnformeerd.\n\nROL: wanneer schaal je op? Wat heeft prioriteit: dijkversterking of evacuatie? Geef een duidelijk besluit.",
    triggerTime: 1500,
    targetRole: "ROL",
  },

  // ── Fase 2: GRIP 3 — Dijkdoorbraak ─────────────────────────────────────────
  {
    title: "03:56 — DIJKDOORBRAAK | Water stroomt Limborgum binnen",
    content:
      "De Maasdijk is doorgebroken. Een groot gat van circa 40 meter is ontstaan. Water stroomt met hoge snelheid de woonwijk achter de dijk binnen. Straten staan snel 50–80 cm onder water. Stroom valt deels uit. Mobiele netwerken raken overbelast. Mensen die nog in de overstromingszone waren, zitten vast.\n\nAlle eenheden: volledige opschaling. Wat zijn de prioriteiten op dit moment?",
    triggerTime: 1800,
    targetRole: null,
  },
  {
    title: "04:30 — Opvanglocaties vol | Noodopvang nodig",
    content:
      "De sporthal aan de Wilhelminastraat (primaire opvanglocatie) zit vol met 280 geëvacueerden. Nog minstens 600 inwoners zoeken onderdak. Er zijn nog geen alternatieve locaties ingericht. Het historisch stadscentrum staat deels droog en wordt voorgesteld als noodopvang.\n\nBZ: welke locaties zijn beschikbaar? Hoe organiseer je opvang voor grote groepen midden in de nacht?",
    triggerTime: 2100,
    targetRole: "BZ",
  },
  {
    title: "05:15 — Defensie aanvraag: boten voor zorgcentrum",
    content:
      "Het zorgcentrum is bereikbaar geworden via water. De OvD-B meldt dat reguliere evacuatiemiddelen tekort komen voor de 35 bedlegerige bewoners. Defensie beschikt over DUKW-vaartuigen en Zodiac-boten, maar formele aanvraag is vereist via de civiele autoriteiten. Inzet: minimaal 4 uur na aanvraag.\n\nDEF: wat kun je inzetten en op welke termijn? Is de aanvraag al gedaan via de juiste kanalen?",
    triggerTime: 2400,
    targetRole: "DEF",
  },

  // ── Fase 3: Escalatie & neveneffecten ──────────────────────────────────────
  {
    title: "07:00 — Brug dreigt te bezwijken",
    content:
      "Rijkswaterstaat meldt dat de Maasbrug aan de oostkant van Limborgum mogelijk instabiel is geworden door de waterkrachten. Dit is de enige brug die de stad verbindt met de andere oever. Afsluiting snijdt de aanvoerroute voor hulpdiensten af — maar openhouding riskeert een instorting.\n\nRWS: wat is jouw advies? Afsluiten of openhouden?",
    triggerTime: 2700,
    targetRole: "RWS",
  },
  {
    title: "08:30 — Misinformatie & NL-Alert discussie",
    content:
      "Op sociale media circuleert het bericht dat het drinkwater in Limborgum besmet is door het overstromingswater. Dit is onbevestigd maar zorgt voor massale onrust. Tegelijkertijd vragen meerdere media om een officieel statement. Er is nog geen NL-Alert verstuurd met actuele informatie.\n\nCOM: wat communiceer je nu? Hoe ga je om met onrust zonder alles zeker te weten?",
    triggerTime: 3000,
    targetRole: "COM",
  },
  {
    title: "09:45 — Plunderingen in verlaten wijken",
    content:
      "Politie ontvangt meldingen van plunderingen in verlaten woonwijken in de overstromingszone. Een groep van circa 20 personen is gesignaleerd in de Rembrandtstraat. Inzet van politie in het overstromingsgebied is gevaarlijk en vraagt om specifieke middelen.\n\nOvD-P: hoe handel je dit? Zet je eenheden in het water in? Wat is de prioriteit tegenover andere politietaken?",
    triggerTime: 3300,
    targetRole: "OvD-P",
  },
  {
    title: "11:00 — BESLISMOMENT: Nationale crisisstructuur?",
    content:
      "De schade in Limborgum overstijgt de capaciteit van de veiligheidsregio. De provinciale crisisorganisatie is al actief. Er wordt overwogen om de nationale crisisstructuur (NCTV/ministerieel) te activeren. Dit brengt extra capaciteit en middelen, maar ook minder lokale regie.\n\nROL: adviseer de burgemeester. Ga je voor nationale activering of houd je regie lokaal?",
    triggerTime: 3600,
    targetRole: "ROL",
  },
];

// ─── Feedback questions ───────────────────────────────────────────────────────

const feedbackQuestions = [
  { question: "Hoe goed heb je samengewerkt met andere disciplines?", order: 1 },
  { question: "Hoe goed kon je beslissingen nemen onder tijdsdruk?", order: 2 },
  { question: "Hoe realistisch vond je het scenario?", order: 3 },
  { question: "Hoe duidelijk was jouw rol tijdens de oefening?", order: 4 },
  { question: "In hoeverre heeft deze oefening je kennis van crisisbeheersing vergroot?", order: 5 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Clearing existing data...");

  // Delete in dependency order; feedbackQuestions cascade from scenario
  await prisma.decision.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.$executeRawUnsafe('DELETE FROM "Feedback"');
  await prisma.session.deleteMany({});
  await prisma.inject.deleteMany({});
  await prisma.scenario.deleteMany({}); // cascades feedbackQuestions
  await prisma.ability.deleteMany({});
  await prisma.role.deleteMany({});

  console.log("Seeding roles...");

  for (const role of roles) {
    // Create with fields the stale client knows; patch new fields via raw SQL
    const created = await prisma.role.create({
      data: {
        name: role.name,
        shortName: role.shortName,
        description: role.description,
        abilities: {
          create: role.abilities.map((a) => ({
            name: a.name,
            description: a.description,
          })),
        },
      },
    });
    // Patch briefing (field added after client was generated)
    await prisma.$executeRawUnsafe(
      `UPDATE "Role" SET briefing = $1 WHERE id = $2`,
      role.briefing,
      created.id,
    );
    console.log(`  ✓ ${created.shortName} — ${created.name}`);
  }

  console.log("Seeding scenario...");

  // Create scenario with known fields only, patch everything else via raw SQL
  const scenario = await prisma.scenario.create({
    data: {
      id: SCENARIO_ID,
      title: scenarioData.title,
      description: scenarioData.description,
    },
  });

  // Patch fields added after client was generated
  await prisma.$executeRawUnsafe(
    `UPDATE "Scenario" SET "incidentLat" = $1, "incidentLng" = $2, phases = $3::jsonb, "customOverlays" = $4::jsonb WHERE id = $5`,
    scenarioData.incidentLat,
    scenarioData.incidentLng,
    JSON.stringify(scenarioData.phases),
    JSON.stringify(customOverlays),
    SCENARIO_ID,
  );

  // Create injects separately
  for (const inject of injects) {
    await prisma.inject.create({
      data: { ...inject, scenarioId: SCENARIO_ID },
    });
  }

  console.log(`  ✓ Scenario: ${scenario.title}`);
  console.log(`  ✓ ${injects.length} injects aangemaakt`);

  console.log("Seeding feedback questions...");

  for (const fq of feedbackQuestions) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "FeedbackQuestion" (id, "scenarioId", question, "order", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, now())`,
      SCENARIO_ID,
      fq.question,
      fq.order,
    );
  }

  console.log(`  ✓ ${feedbackQuestions.length} feedbackvragen aangemaakt`);
  console.log("\nSeeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
