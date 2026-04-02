export function printHeader(title) {
  console.log(title);
  console.log("=".repeat(title.length));
}

export function printList(items) {
  for (const item of items) {
    console.log(`- ${item}`);
  }
}
