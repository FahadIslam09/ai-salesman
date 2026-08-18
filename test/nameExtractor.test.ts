import { extractNameFromGreeting } from "../src/utils/nameExtractor";

describe("extractNameFromGreeting", () => {
  it("extracts English names from Facebook auto-reply greetings", () => {
    expect(extractNameFromGreeting("Hi HA Sib Reza, Thanks for reaching out to us.")).toBe("HA Sib Reza");
    expect(extractNameFromGreeting("Hi HA Sib Reza, thanks for reaching out to us.")).toBe("HA Sib Reza");
    expect(extractNameFromGreeting("Hello Fahad Islam! How can we help you?")).toBe("Fahad Islam");
    expect(extractNameFromGreeting("Hey Tanvir Ahmed, welcome to our store.")).toBe("Tanvir Ahmed");
    expect(extractNameFromGreeting("Dear Sarah Connor, thank you for contacting us.")).toBe("Sarah Connor");
    expect(extractNameFromGreeting("Thanks for reaching out to us, HA Sib Reza!")).toBe("HA Sib Reza");
  });

  it("extracts Bengali names from Bengali auto-replies", () => {
    expect(extractNameFromGreeting("হ্যালো তানভীর আহমেদ, নকশা ফ্যাশনে স্বাগতম")).toBe("তানভীর আহমেদ");
    expect(extractNameFromGreeting("আসসালামু আলাইকুম মো: রফিকুল ইসলাম! আমাদের পেজে স্বাগতম")).toBe("মো: রফিকুল ইসলাম");
  });

  it("rejects generic greetings and non-names", () => {
    expect(extractNameFromGreeting("Hi there, how can we help?")).toBeNull();
    expect(extractNameFromGreeting("Hello everyone!")).toBeNull();
    expect(extractNameFromGreeting("Hello!")).toBeNull();
    expect(extractNameFromGreeting("Hi brother, how are you?")).toBeNull();
    expect(extractNameFromGreeting("Hi customer")).toBeNull();
  });
});
