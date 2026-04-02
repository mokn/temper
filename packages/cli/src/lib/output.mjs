export const TEMPER_SWORD_ART = String.raw`
                 (  )
                )    (
               (  /\  )
                \/  \/
                  /\
                 /  \
                / /\ \
               / /  \ \
              /_/____\_\
                  ||
                  ||
                  ||
               ___||___
              /___==___\
                 /__\

              T E M P E R
      Heat. Hammer. Quench. Ship.
`.trim();

export function printTemperBanner(subtitle) {
  console.log(TEMPER_SWORD_ART);
  if (subtitle) {
    console.log("");
    console.log(subtitle);
  }
}

export function printHeader(title) {
  console.log(title);
  console.log("=".repeat(title.length));
}

export function printList(items) {
  for (const item of items) {
    console.log(`- ${item}`);
  }
}
