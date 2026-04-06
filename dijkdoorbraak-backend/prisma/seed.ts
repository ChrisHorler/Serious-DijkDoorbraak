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

// Incident: dike breach near Venlo, Noord-Limburg
const INCIDENT_LAT = 51.3704;
const INCIDENT_LNG = 6.1724;

const SCENARIO_ID = "00000000-0000-0000-0000-000000000001";

const scenarioData = {
  title: "Dijkdoorbraak Venlo",
  description:
    "Na dagen van hevige regenval staat de Maas bij Venlo extreem hoog. Op dijkvak 14 bij Venlo-Noord constateert Rijkswaterstaat een kritieke lekkage. Binnen twee uur breekt de dijk door. Water stroomt snel het gebied achter de dijk in — straten, woningen en bedrijven lopen onder. Wegen worden onbegaanbaar, stroom en drinkwater vallen deels uit. Het ROT wordt geactiveerd.",
  incidentLat: INCIDENT_LAT,
  incidentLng: INCIDENT_LNG,
  phases: [
    {
      id: "phase-1",
      name: "Fase 1 — Waarschuwing",
      floodZoneScale: 0.5,
      activeOverlayIds: [],
      injectId: null,
    },
    {
      id: "phase-2",
      name: "Fase 2 — Dijkdoorbraak",
      floodZoneScale: 1.0,
      activeOverlayIds: [],
      injectId: null,
    },
    {
      id: "phase-3",
      name: "Fase 3 — Opschaling & Evacuatie",
      floodZoneScale: 1.8,
      activeOverlayIds: [],
      injectId: null,
    },
  ],
};

// Injects — triggerTime is in seconds (used as a reference; admin fires manually)
const injects = [
  {
    title: "Waterstand bereikt alarmfase",
    content:
      "Rijkswaterstaat meldt dat de Maas bij Venlo 2,4 meter boven normaal staat en verder stijgt. Dijkvak 14 bij Venlo-Noord vertoont scheuren. De dijkwacht heeft alarm geslagen. Het ROT wordt geactiveerd. Beeldvorming: wat weten we en wat hebben we nog nodig?",
    triggerTime: 60,
    targetRole: null,
  },
  {
    title: "Dijkdoorbraak geconstateerd",
    content:
      "Dijkvak 14 bij Venlo-Noord is doorgebroken. Water stroomt het gebied in met een snelheid van circa 50 m³/s. De wijk Blerick loopt gedeeltelijk onder. Eerste bewoners melden zich bij de hulpdiensten. Schaal op.",
    triggerTime: 300,
    targetRole: null,
  },
  {
    title: "Stroomuitval woonwijk Blerick",
    content:
      "Netbeheerder meldt stroomuitval in woonwijk Blerick. Circa 3.200 huishoudens zitten zonder stroom. Het transformatorstation staat onder water. Verwachte hersteltijd: onbekend.",
    triggerTime: 480,
    targetRole: "BZ",
  },
  {
    title: "Opvanglocaties dreigen vol te lopen",
    content:
      "Sporthal De Kegel (Venlo) zit vol — 350 geëvacueerden, maximumcapaciteit bereikt. Nog minstens 500 bewoners zijn onderweg naar de opvang. Extra locaties zijn nodig.",
    triggerTime: 600,
    targetRole: "BZ",
  },
  {
    title: "Misinformatie op sociale media",
    content:
      "Op sociale media circuleren berichten dat ook de dijk bij Tegelen doorbreekt en dat het drinkwater besmet is. Deze berichten zijn onbevestigd maar zorgen voor paniek. Meerdere inwoners bellen 112 met vragen.",
    triggerTime: 720,
    targetRole: "COM",
  },
  {
    title: "Verzoek militaire ondersteuning",
    content:
      "De Operationeel Leider overweegt een formele aanvraag voor militaire bijstand. Boten en viertonners zijn nodig voor evacuatie van mensen die niet zelfstandig weg kunnen. Defensie geeft aan dat inzet minimaal vier uur voorbereiding vergt.",
    triggerTime: 900,
    targetRole: "DEF",
  },
  {
    title: "Verpleeghuis De Vliet bedreigd",
    content:
      "Verpleeghuis De Vliet in Blerick staat 80 cm onder water. Er verblijven 120 bewoners die niet zelfstandig kunnen evacueren. Het personeel vraagt om dringende hulp. GHOR en brandweer zijn gevraagd te reageren.",
    triggerTime: 1080,
    targetRole: "GHOR",
  },
  {
    title: "N271 dreigt onbegaanbaar",
    content:
      "De N271 (Venlo–Tegelen) staat op meerdere punten onder water. Dit is de belangrijkste evacuatieroute uit het getroffen gebied. Rijkswaterstaat overweegt afsluiting — maar dit belemmert ook de aanvoer van hulpdiensten.",
    triggerTime: 1260,
    targetRole: "OvD-P",
  },
  {
    title: "Drinkwatervoorziening in gevaar",
    content:
      "Waterbedrijf Limburg meldt dat het pompstation bij Blerick mogelijk wordt bereikt door het overstromingswater. Bij uitval dreigt drinkwatertekort voor 80.000 inwoners. Er wordt gevraagd om een besluit over bescherming of noodalternatief.",
    triggerTime: 1440,
    targetRole: "RWS",
  },
  {
    title: "Bewoners weigeren evacuatie",
    content:
      "In de Vossener Molen-wijk weigeren meerdere tientallen bewoners te evacueren. Ze willen hun eigendommen bewaken. De politie vraagt om een bestuurlijk besluit: kan evacuatie worden afgedwongen?",
    triggerTime: 1620,
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
    `UPDATE "Scenario" SET "incidentLat" = $1, "incidentLng" = $2, phases = $3::jsonb WHERE id = $4`,
    scenarioData.incidentLat,
    scenarioData.incidentLng,
    JSON.stringify(scenarioData.phases),
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
