import "dotenv/config";
import { db } from "./index";
import { quotes } from "./schema";

const systemQuotes = [
  // David Goggins
  { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" },
  { text: "The only way you're going to get to the other side of this journey is to suffer. You have to suffer.", author: "David Goggins" },
  { text: "We live in a world where mediocrity is often rewarded. Don't be mediocre.", author: "David Goggins" },
  { text: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential.", author: "David Goggins" },
  { text: "It's a lot more than mind over matter. It takes relentless self-discipline to schedule suffering into your day.", author: "David Goggins" },
  { text: "The most important conversations you'll ever have are the ones you'll have with yourself.", author: "David Goggins" },
  { text: "Suffering is the true test of life.", author: "David Goggins" },
  { text: "Nobody cares what you did yesterday. What have you done today to better yourself?", author: "David Goggins" },
  { text: "You want to be uncommon amongst uncommon people. Period.", author: "David Goggins" },
  { text: "Motivation is crap. Motivation comes and goes. When you're driven, whatever is in front of you will get destroyed.", author: "David Goggins" },

  // Dan Koe
  { text: "Your habits are a reflection of your identity. Change your identity, change your life.", author: "Dan Koe" },
  { text: "The quality of your life is determined by the quality of your thoughts.", author: "Dan Koe" },
  { text: "Stop consuming. Start creating.", author: "Dan Koe" },
  { text: "You don't need more information. You need more implementation.", author: "Dan Koe" },
  { text: "Clarity comes from action, not thought.", author: "Dan Koe" },
  { text: "The things you avoid are the things you need to do.", author: "Dan Koe" },
  { text: "Build in public. Learn in public. Grow in public.", author: "Dan Koe" },
  { text: "Your attention is your most valuable asset. Protect it.", author: "Dan Koe" },
  { text: "The goal isn't to be busy. The goal is to be effective.", author: "Dan Koe" },
  { text: "What got you here won't get you there. Evolve or stay stuck.", author: "Dan Koe" },

  // Elon Musk
  { text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
  { text: "I think it's very important to have a feedback loop, where you're constantly thinking about what you've done and how you could be doing it better.", author: "Elon Musk" },
  { text: "Persistence is very important. You should not give up unless you are forced to give up.", author: "Elon Musk" },
  { text: "The first step is to establish that something is possible; then probability will occur.", author: "Elon Musk" },
  { text: "If you get up in the morning and think the future is going to be better, it is a bright day.", author: "Elon Musk" },
  { text: "Work like hell. Put in 80 to 100 hour weeks every week. This improves the odds of success.", author: "Elon Musk" },
  { text: "It's OK to have your eggs in one basket as long as you control what happens to that basket.", author: "Elon Musk" },
  { text: "I think people can choose to be not ordinary.", author: "Elon Musk" },
  { text: "Failure is an option here. If things are not failing, you are not innovating enough.", author: "Elon Musk" },
  { text: "Don't confuse schooling with education. I didn't go to Harvard but the people that work for me did.", author: "Elon Musk" },
];

async function seedQuotes() {
  console.log("Seeding system quotes...");

  try {
    for (const quote of systemQuotes) {
      await db
        .insert(quotes)
        .values({
          userId: null, // system quote, not tied to a user
          text: quote.text,
          author: quote.author,
          isActive: true,
          isSystem: true,
        });
    }

    console.log(`Seeded ${systemQuotes.length} system quotes successfully!`);
  } catch (error) {
    console.error("Seed quotes failed:", error);
    process.exit(1);
  }
}

seedQuotes();
