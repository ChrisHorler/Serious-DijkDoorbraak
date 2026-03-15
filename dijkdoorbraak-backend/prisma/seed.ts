import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const roles = [
  {
    name: "Leider CoPI",
    shortName: "LC",
    description:
      "Eindverantwoordelijke op de plaats incident. Coördineert alle CoPI-leden en neemt finale beslissingen.",
    abilities: [
      "Opschalen naar GRIP 2",
      "Afschalen naar lager GRIP-niveau",
      "Evacuatiebevel uitvaardigen",
      "Perimeter instellen",
      "Vergadering CoPI bijeenroepen",
      "Taakuitdeling aan CoPI-leden bevestigen",
      "Opschalingsadvies aan ROT doorgeven",
      "Afstemming met burgemeester initiëren",
      "Scenario-update aan alle eenheden versturen",
      "Aanvraag extra capaciteit indienen",
    ],
  },
  {
    name: "Officier van Dienst Brandweer",
    shortName: "OvD-B",
    description: "Verantwoordelijk voor brandweerinzet op de plaats incident.",
    abilities: [
      "Reddings- en bergingsploeg inzetten",
      "Pompcapaciteit verhogen",
      "Aanvraag duikersteam indienen",
      "Brandweervoertuigen herpositioneren",
      "Dijkversterkingsmateriaal aanvragen",
      "Gevaarlijke stoffen protocol activeren",
      "Evacuatieroutes afstemmen met politie",
      "Technische verkenning uitvoeren",
      "Waterstand meten en rapporteren",
      "Opschaling brandweercapaciteit aanvragen",
    ],
  },
  {
    name: "Officier van Dienst Politie",
    shortName: "OvD-P",
    description:
      "Verantwoordelijk voor openbare orde, verkeersbeheer en afzetting op en rond de plaats incident.",
    abilities: [
      "Afzettingsperimeter instellen",
      "Verkeersomleidingen activeren",
      "Crowd control inzetten",
      "Vermiste personen protocol starten",
      "Opsporingsonderzoek initiëren",
      "Assistentie aanvragen bij buurkorps",
      "Verdacht gedrag melden aan LC",
      "Evacuatieverkeer begeleiden",
      "Toegang media reguleren",
      "Noodcommunicatie naar publiek coördineren",
    ],
  },
  {
    name: "Officier van Dienst Geneeskundig",
    shortName: "OvD-G",
    description:
      "Verantwoordelijk voor medische hulpverlening, triage en slachtofferregistratie.",
    abilities: [
      "Medische triage starten",
      "Gewondennest inrichten",
      "Ambulances prioriteren",
      "GHOR opschalen",
      "Ziekenhuiscapaciteit opvragen",
      "Psychosociale hulpverlening (PSH) activeren",
      "Besmettingsrisico beoordelen",
      "Slachtofferregistratie starten",
      "Medische aanvoerroute vrijhouden",
      "Bijstandsaanvraag geneeskundig indienen",
    ],
  },
  {
    name: "Gemeentelijk Vertegenwoordiger",
    shortName: "GBT",
    description: "Vertegenwoordigt het gemeentebestuur op de plaats incident.",
    abilities: [
      "Noodverordening adviseren",
      "Opvanglocatie activeren",
      "Gemeentelijke crisisorganisatie informeren",
      "Burgemeester briefen",
      "Publiekscommunicatie autoriseren",
      "Sociale media monitoring activeren",
      "Omgevingsdienst inschakelen",
      "Schaderegistratie opstarten",
      "Nazorg bewoners coördineren",
      "Bestuurlijk opschalingsadvies geven",
    ],
  },
  {
    name: "Liaison Waterschap",
    shortName: "LW",
    description:
      "Vertegenwoordigt het waterschap op de plaats incident. Expert waterbeheer.",
    abilities: [
      "Dijkinspectie uitvoeren",
      "Waterstand monitoring intensiveren",
      "Noodmaatregel waterkeringen activeren",
      "Zandzakkenoperatie coördineren",
      "Gemaalcapaciteit verhogen",
      "Dijkdoorbraakrisico beoordelen",
      "Evacuatiedrempel waterpeil bepalen",
      "Technisch advies aan LC geven",
      "Hulp Rijkswaterstaat aanvragen",
      "Waterschap crisisteam activeren",
    ],
  },
  {
    name: "Informatiemanager",
    shortName: "IM",
    description:
      "Verantwoordelijk voor verzamelen, verwerken en delen van informatie binnen het CoPI.",
    abilities: [
      "Operationeel beeld bijwerken",
      "Situatierapport opstellen",
      "Informatieoverdracht naar ROT coördineren",
      "GIS-kaart actualiseren",
      "Logboek bijhouden",
      "Knelpunten signaleren aan LC",
      "Informatiebehoeften inventariseren",
      "Tijdlijn incident bijhouden",
      "Communicatiekanalen bewaken",
      "Briefingdocument voorbereiden",
    ],
  },
  {
    name: "Woordvoerder",
    shortName: "WV",
    description:
      "Verantwoordelijk voor externe communicatie naar media en publiek namens het CoPI.",
    abilities: [
      "Persbericht opstellen",
      "Persconferentie organiseren",
      "Sociale media update plaatsen",
      "Mediaverzoeken coördineren",
      "Crisiscommunicatieplan activeren",
      "Onjuiste berichtgeving corrigeren",
      "NL-Alert bericht voorbereiden",
      "Communicatie afstemmen met gemeente",
      "Woordvoering afstemmen met LC",
      "Publieksvoorlichting coördineren",
    ],
  },
  {
    name: "Liaison Defensie",
    shortName: "LD",
    description:
      "Vertegenwoordigt de krijgsmacht op de plaats incident. Coördineert militaire bijstand (CBCA).",
    abilities: [
      "Militaire bijstandsaanvraag (CBCA) indienen",
      "Verkenningsteam inzetten",
      "Transportcapaciteit beschikbaar stellen",
      "Pioniers inzetten voor dijkversterking",
      "Helikopterinzet coördineren",
      "Noodstroomaggregaten plaatsen",
      "Militaire geneeskundige ondersteuning activeren",
      "Verbindingsapparatuur beschikbaar stellen",
      "Defensie capaciteitsoverzicht aanleveren",
      "Optreden afstemmen met OvD-B en LC",
    ],
  },
];

async function main() {
  console.log("Seeding roles and abilities....");

  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { shortName: role.shortName },
      update: {},
      create: {
        name: role.name,
        shortName: role.shortName,
        description: role.description,
        abilities: {
          create: role.abilities.map((name) => ({ name })),
        },
      },
    });
    console.log(`${created.shortName} - ${created.name}`);
  }

  console.log("Seeding scenario...");

  await prisma.scenario.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Dijkdoorbraak Kinderdijk",
      description:
        "Een dijk bij Kinderdijk dreigt door te breken door hoge waterstand. Het CoPI wordt geactiveerd en moet coördineren.",
      Injects: {
        create: [
          {
            title: "Eerste melding: dijklekkage",
            content:
              "Rijkswaterstaat meldt een zichtbare lekkage aan de dijk bij km 14.3. Waterstand stijgt snel. Schakel op.",
            triggerTime: 60,
            targetRole: null,
          },
          {
            title: "Evacuatiedruk neemt toe",
            content:
              "Bewoners van de Alblasserwaard weigeren te evacueren. Politie vraagt om ondersteuning bij crowd control.",
            triggerTime: 180,
            targetRole: "OvD-P",
          },
          {
            title: "Dijkbreuk dreigt",
            content:
              "Waterschap meldt dat de dijk maximaal 30 minuten stand houdt. Directe actie vereist. Zandzakken en pioniers inzetten.",
            triggerTime: 300,
            targetRole: "LW",
          },
          {
            title: "Gewonden gemeld",
            content:
              "Vijf gewonden gemeld bij de dijkvoet. Triage locatie nog niet ingericht.",
            triggerTime: 420,
            targetRole: "OvD-G",
          },
          {
            title: "Media arriveert",
            content:
              "Meerdere nieuwsploegen arriveren ter plaatse. Geen officiële woordvoering gegeven.",
            triggerTime: 540,
            targetRole: "WV",
          },
        ],
      },
    },
  });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
