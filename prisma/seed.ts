import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DUMMY_NAMES = [
  "Aarav Sharma", "Diya Patel", "Vihaan Reddy", "Ananya Iyer", "Arjun Nair",
  "Ishaan Gupta", "Saanvi Rao", "Kabir Menon", "Myra Verma", "Reyansh Joshi",
  "Aadhya Kapoor", "Vivaan Malhotra", "Anika Desai", "Aryan Chatterjee", "Navya Pillai",
  "Dhruv Bhatt", "Kiara Agarwal", "Aditya Krishnan", "Riya Bose", "Yash Kulkarni",
];

function slugFromName(name: string) {
  return name.toLowerCase().replace(/\s+/g, ".");
}

async function main() {
  console.log("Seeding database...");

  // --- Admins ---
  const admin1 = await prisma.user.upsert({
    where: { isbEmail: "cacadmin@isb.edu" },
    update: {},
    create: {
      name: "CAC Admin",
      isbEmail: "cacadmin@isb.edu",
      pgpId: "ADMIN001",
      isAdmin: true,
    },
  });

  await prisma.user.upsert({
    where: { isbEmail: "cacadmin2@isb.edu" },
    update: {},
    create: {
      name: "CAC Admin Two",
      isbEmail: "cacadmin2@isb.edu",
      pgpId: "ADMIN002",
      isAdmin: true,
    },
  });

  // --- Dummy users ---
  const users = [];
  for (let i = 0; i < DUMMY_NAMES.length; i++) {
    const name = DUMMY_NAMES[i];
    const idNum = String(i + 1).padStart(3, "0");
    const user = await prisma.user.upsert({
      where: { isbEmail: `${slugFromName(name)}@isb.edu` },
      update: {},
      create: {
        name,
        isbEmail: `${slugFromName(name)}@isb.edu`,
        pgpId: `PGP2027${idNum}`,
        isAdmin: false,
      },
    });
    users.push(user);
  }

  // --- Event: OCC ---
  const now = new Date();
  const day1 = new Date(now);
  day1.setUTCDate(day1.getUTCDate() + 7);
  day1.setUTCHours(3, 30, 0, 0); // 09:00 IST
  const day2 = new Date(day1);
  day2.setUTCDate(day2.getUTCDate() + 1);

  const bookingDeadline = new Date(now);
  bookingDeadline.setUTCDate(bookingDeadline.getUTCDate() + 5);

  const startDate = new Date(day1);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(day2);
  endDate.setUTCHours(23, 59, 59, 0);

  const existingEvent = await prisma.event.findFirst({ where: { name: "OCC" } });
  const event = existingEvent
    ? existingEvent
    : await prisma.event.create({
        data: {
          name: "OCC",
          description: "On-Campus Connect — CAC's flagship 2-day recruiting event.",
          startDate,
          endDate,
          bookingDeadline,
          status: "published",
          overlapCheckEnabled: true,
          createdById: admin1.id,
        },
      });

  // --- Sessions ---
  // IST hour:minute -> UTC, borrowing across the hour boundary as needed (IST = UTC+5:30).
  function ist(base: Date, hour: number, minute: number) {
    const d = new Date(base);
    let h = hour - 5;
    let m = minute - 30;
    if (m < 0) {
      m += 60;
      h -= 1;
    }
    d.setUTCHours(h, m, 0, 0);
    return d;
  }

  const day1Base = new Date(startDate);
  const day2Base = new Date(day1Base);
  day2Base.setUTCDate(day2Base.getUTCDate() + 1);

  const sessionDefs = [
    {
      title: "Resume Bootcamp",
      description: "Hands-on resume review and rewriting workshop.",
      dayLabel: "Day 1",
      base: day1Base,
      start: [9, 0],
      end: [10, 30],
      venueName: "AC-1",
      venueLocation: "Academic Block, Ground Floor",
      capacity: 40,
      speakerProfileId: "SPK-101",
      speakerDescription: "Priya Menon, Career Coach",
    },
    {
      title: "Consulting Case Interview Prep",
      description: "Live case walkthroughs with ex-MBB consultants.",
      dayLabel: "Day 1",
      base: day1Base,
      start: [11, 0],
      end: [12, 30],
      venueName: "AC-2",
      venueLocation: "Academic Block, Ground Floor",
      capacity: 30,
      speakerProfileId: "SPK-102",
      speakerDescription: "Rahul Sinha, Ex-McKinsey Engagement Manager",
    },
    {
      title: "Meet the Recruiters: Product Management",
      description: "Small-group Q&A with PM hiring managers.",
      dayLabel: "Day 1",
      base: day1Base,
      start: [14, 0],
      end: [15, 0],
      venueName: "Executive Lounge",
      venueLocation: "OAB, 2nd Floor",
      capacity: 3,
      speakerProfileId: "SPK-103",
      speakerDescription: "Panel of PM Recruiters",
    },
    {
      title: "Negotiation Masterclass",
      description: "How to negotiate your offer with confidence.",
      dayLabel: "Day 1",
      base: day1Base,
      start: [16, 0],
      end: [17, 30],
      venueName: "AC-1",
      venueLocation: "Academic Block, Ground Floor",
      capacity: 50,
      speakerProfileId: "SPK-104",
      speakerDescription: "Dr. Kavita Rao, Negotiation Faculty",
    },
    {
      title: "Finance Networking Breakfast",
      description: "Informal networking with finance sector alumni.",
      dayLabel: "Day 2",
      base: day2Base,
      start: [9, 0],
      end: [10, 0],
      venueName: "Café Court",
      venueLocation: "Student Center",
      capacity: 25,
      speakerProfileId: "SPK-105",
      speakerDescription: "ISB Finance Alumni Circle",
    },
    {
      title: "Tech Interview Deep Dive",
      description: "System design and coding interview strategy session.",
      dayLabel: "Day 2",
      base: day2Base,
      start: [10, 30],
      end: [12, 0],
      venueName: "AC-3",
      venueLocation: "Academic Block, 1st Floor",
      capacity: 35,
      speakerProfileId: "SPK-106",
      speakerDescription: "Anil Kumar, Staff Engineer",
    },
    {
      title: "Personal Branding on LinkedIn",
      description: "Building a recruiter-ready professional presence.",
      dayLabel: "Day 2",
      base: day2Base,
      start: [13, 30],
      end: [14, 30],
      venueName: "AC-2",
      venueLocation: "Academic Block, Ground Floor",
      capacity: 45,
      speakerProfileId: "SPK-107",
      speakerDescription: "Neha Bhatt, LinkedIn Talent Brand Lead",
    },
    {
      title: "CXO Fireside Chat",
      description: "Closing keynote with a panel of industry CXOs.",
      dayLabel: "Day 2",
      base: day2Base,
      start: [16, 0],
      end: [17, 30],
      venueName: "Main Auditorium",
      venueLocation: "OAB, Ground Floor",
      capacity: 3,
      speakerProfileId: "SPK-108",
      speakerDescription: "Panel of CXOs",
    },
  ];

  const existingSessions = await prisma.session.count({ where: { eventId: event.id } });
  if (existingSessions === 0) {
    for (const s of sessionDefs) {
      await prisma.session.create({
        data: {
          eventId: event.id,
          title: s.title,
          description: s.description,
          dayLabel: s.dayLabel,
          startsAt: ist(s.base, s.start[0], s.start[1]),
          endsAt: ist(s.base, s.end[0], s.end[1]),
          venueName: s.venueName,
          venueLocation: s.venueLocation,
          capacity: s.capacity,
          speakerProfileId: s.speakerProfileId,
          speakerDescription: s.speakerDescription,
          status: "open",
        },
      });
    }
  }

  // --- Ticket allotments: 2 tickets per user for OCC ---
  for (const user of users) {
    await prisma.eventTicketAllotment.upsert({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      update: {},
      create: {
        eventId: event.id,
        userId: user.id,
        ticketsAllotted: 2,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: cacadmin@isb.edu / ADMIN001");
  console.log(`Sample user login: ${users[0].isbEmail} / ${users[0].pgpId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
