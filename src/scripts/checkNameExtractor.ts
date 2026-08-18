import { extractNameFromGreeting } from "../utils/nameExtractor";
import assert from "node:assert/strict";

function check() {
  assert.equal(
    extractNameFromGreeting("Hi HA Sib Reza, Thanks for reaching out to us."),
    "HA Sib Reza"
  );
  assert.equal(
    extractNameFromGreeting("Hi HA Sib Reza, thanks for reaching out to us."),
    "HA Sib Reza"
  );
  assert.equal(
    extractNameFromGreeting("Hello Fahad Islam! How can we help you?"),
    "Fahad Islam"
  );
  assert.equal(
    extractNameFromGreeting("Hey Tanvir Ahmed, welcome to our store."),
    "Tanvir Ahmed"
  );
  assert.equal(
    extractNameFromGreeting("Dear Sarah Connor, thank you for contacting us."),
    "Sarah Connor"
  );
  assert.equal(
    extractNameFromGreeting("Thanks for reaching out to us, HA Sib Reza!"),
    "HA Sib Reza"
  );
  assert.equal(
    extractNameFromGreeting("হ্যালো তানভীর আহমেদ, নকশা ফ্যাশনে স্বাগতম"),
    "তানভীর আহমেদ"
  );
  assert.equal(
    extractNameFromGreeting("আসসালামু আলাইকুম মো: রফিকুল ইসলাম! আমাদের পেজে স্বাগতম"),
    "মো: রফিকুল ইসলাম"
  );
  assert.equal(extractNameFromGreeting("Hi there, how can we help?"), null);
  assert.equal(extractNameFromGreeting("Hello everyone!"), null);
  assert.equal(extractNameFromGreeting("Hello!"), null);
  assert.equal(extractNameFromGreeting("Hi brother, how are you?"), null);

  console.log("✅ All name extractor assertions passed!");
}

check();
