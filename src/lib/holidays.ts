/**
 * US holiday calendar with floating-date calculations. Used to surface
 * upcoming holidays to the operator so they can generate a themed
 * marketing campaign before the day arrives.
 *
 * Each holiday has a "vibe" hint that gets passed into the AI prompt so
 * the generated copy lands the right tone — Memorial Day patriotic,
 * Valentine's romantic, Thanksgiving grateful, etc.
 */

export interface Holiday {
  /** Stable slug, used as the AI prompt key. */
  slug: string;
  /** Display name. */
  name: string;
  /** Computed date (Y-M-D) for the current year. */
  date: Date;
  /** Vibe / tone hint for the AI copy generator. */
  vibe: string;
  /** A few angles the AI can play with — luxury rental specific. */
  angles: string[];
  /** Suggested promo code prefix (e.g. "MEMORIAL"). */
  promoPrefix: string;
}

// Helpers for floating-date holidays.
function nthWeekdayOfMonth(
  year: number,
  month0: number,
  weekday: number,
  n: number,
): Date {
  const d = new Date(Date.UTC(year, month0, 1));
  const offset = (weekday - d.getUTCDay() + 7) % 7;
  d.setUTCDate(1 + offset + (n - 1) * 7);
  return d;
}
function lastWeekdayOfMonth(year: number, month0: number, weekday: number): Date {
  // Walk back from the last day of the month.
  const d = new Date(Date.UTC(year, month0 + 1, 0));
  const offset = (d.getUTCDay() - weekday + 7) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

function buildHolidays(year: number): Holiday[] {
  return [
    {
      slug: "new_years",
      name: "New Year's Day",
      date: new Date(Date.UTC(year, 0, 1)),
      vibe: "fresh-start, optimistic, new-chapter",
      angles: [
        "start the new year with a luxury rental",
        "treat yourself this year",
        "new year, new adventures",
      ],
      promoPrefix: "NEWYEAR",
    },
    {
      slug: "valentines",
      name: "Valentine's Day",
      date: new Date(Date.UTC(year, 1, 14)),
      vibe: "romantic, intimate, premium",
      angles: [
        "surprise your partner with a weekend in a luxury car",
        "make Valentine's Day unforgettable",
        "date night upgrade",
      ],
      promoPrefix: "VDAY",
    },
    {
      slug: "presidents_day",
      name: "Presidents' Day",
      date: nthWeekdayOfMonth(year, 1, 1, 3), // 3rd Monday of February
      vibe: "long weekend, road trip",
      angles: [
        "three-day weekend road trip",
        "get out of town in style",
      ],
      promoPrefix: "PRES",
    },
    {
      slug: "spring_break",
      name: "Spring Break",
      date: new Date(Date.UTC(year, 2, 15)), // mid-March, fuzzy
      vibe: "vacation, sun, fun",
      angles: [
        "spring break in style",
        "make spring break unforgettable",
      ],
      promoPrefix: "SPRING",
    },
    {
      slug: "memorial_day",
      name: "Memorial Day",
      date: lastWeekdayOfMonth(year, 4, 1), // last Monday of May
      vibe: "patriotic, summer kickoff, long weekend",
      angles: [
        "kick off summer with a luxury rental",
        "Memorial Day weekend getaway",
        "the unofficial start of summer",
      ],
      promoPrefix: "MEMORIAL",
    },
    {
      slug: "fathers_day",
      name: "Father's Day",
      date: nthWeekdayOfMonth(year, 5, 0, 3), // 3rd Sunday of June
      vibe: "gift, treat dad, masculine",
      angles: [
        "give dad the ride he's always wanted, for a day",
        "Father's Day gift idea",
      ],
      promoPrefix: "DAD",
    },
    {
      slug: "july_4",
      name: "Fourth of July",
      date: new Date(Date.UTC(year, 6, 4)),
      vibe: "patriotic, celebration, summer",
      angles: [
        "celebrate the Fourth in style",
        "Independence Day road trip",
      ],
      promoPrefix: "JULY4",
    },
    {
      slug: "labor_day",
      name: "Labor Day",
      date: nthWeekdayOfMonth(year, 8, 1, 1), // 1st Monday of September
      vibe: "long weekend, end of summer",
      angles: [
        "send off summer with a road trip",
        "last summer getaway",
      ],
      promoPrefix: "LABOR",
    },
    {
      slug: "halloween",
      name: "Halloween",
      date: new Date(Date.UTC(year, 9, 31)),
      vibe: "playful, fun, weekend",
      angles: [
        "make your Halloween entrance unforgettable",
        "weekend rental for the spooky season",
      ],
      promoPrefix: "BOO",
    },
    {
      slug: "thanksgiving",
      name: "Thanksgiving",
      date: nthWeekdayOfMonth(year, 10, 4, 4), // 4th Thursday of November
      vibe: "grateful, family, road trip",
      angles: [
        "Thanksgiving road trip",
        "drive home for the holidays in comfort",
        "grateful for our customers — here's a thank-you offer",
      ],
      promoPrefix: "THANKS",
    },
    {
      slug: "black_friday",
      name: "Black Friday",
      date: (() => {
        // Day after Thanksgiving = 4th Thursday of Nov + 1.
        const t = nthWeekdayOfMonth(year, 10, 4, 4);
        const d = new Date(t);
        d.setUTCDate(d.getUTCDate() + 1);
        return d;
      })(),
      vibe: "deals, urgency, shopping",
      angles: [
        "biggest rental deal of the year",
        "Black Friday — once a year",
      ],
      promoPrefix: "BF",
    },
    {
      slug: "cyber_monday",
      name: "Cyber Monday",
      date: (() => {
        const t = nthWeekdayOfMonth(year, 10, 4, 4);
        const d = new Date(t);
        d.setUTCDate(d.getUTCDate() + 4);
        return d;
      })(),
      vibe: "online deals, urgency",
      angles: ["online-exclusive rental deal", "book online and save"],
      promoPrefix: "CYBER",
    },
    {
      slug: "christmas",
      name: "Christmas",
      date: new Date(Date.UTC(year, 11, 25)),
      vibe: "festive, family, holiday travel",
      angles: [
        "drive home for Christmas in style",
        "holiday road trip",
        "give the gift of a rental experience",
      ],
      promoPrefix: "XMAS",
    },
    {
      slug: "new_years_eve",
      name: "New Year's Eve",
      date: new Date(Date.UTC(year, 11, 31)),
      vibe: "celebration, glamorous, night-out",
      angles: [
        "arrive at NYE in style",
        "ring in the new year behind the wheel of a luxury car",
      ],
      promoPrefix: "NYE",
    },
  ];
}

/**
 * Returns holidays in the next `daysAhead` days, sorted soonest first.
 * Handles year-end wraparound — if it's Dec 28 and you ask for 30 days
 * out, you get Christmas-or-NYE-this-year plus New Year's next year.
 */
export function upcomingHolidays(daysAhead = 45): Array<
  Holiday & { daysUntil: number }
> {
  const now = Date.now();
  const horizon = now + daysAhead * 24 * 60 * 60 * 1000;
  const thisYear = new Date().getUTCFullYear();
  const all = [
    ...buildHolidays(thisYear),
    ...buildHolidays(thisYear + 1),
  ];
  return all
    .filter((h) => {
      const t = h.date.getTime();
      return t >= now && t <= horizon;
    })
    .map((h) => ({
      ...h,
      daysUntil: Math.ceil((h.date.getTime() - now) / (24 * 60 * 60 * 1000)),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function findHoliday(slug: string): Holiday | null {
  const thisYear = new Date().getUTCFullYear();
  const all = [
    ...buildHolidays(thisYear),
    ...buildHolidays(thisYear + 1),
  ];
  const matches = all
    .filter((h) => h.slug === slug && h.date.getTime() >= Date.now())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return matches[0] ?? null;
}
