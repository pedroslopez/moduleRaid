const puppeteer = require('puppeteer');
const { expect } = require('chai');

const moduleRaid = require('../moduleraid');

describe("moduleRaid", async function() {
  const testModuleId = "myTestModule";

  let page;
  let browser;
  
  before(async function() {
    this.timeout(30000);

    browser = await puppeteer.launch();
    page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36');
    await page.goto("https://web.whatsapp.com/", { waitUntil: 'load' });

    // Add test module
    await page.evaluate((mId) => {
      window.webpackChunkwhatsapp_web_client.push([
        ["moduleRaidTest"], {
          [mId]: (_e,t) => {
            t.someKey = "someValue",
            t.default = {
              someOtherKey: "someOtherValue",
              meaningOfLife: 42
            }
          }
        }
      ]);
    }, testModuleId);
  });

  it("loads all modules", async function() {
    const modules = await page.evaluate((moduleRaidStr) => {
      window.eval('var moduleRaid = ' + moduleRaidStr);
      window.mR = moduleRaid();
      return Object.keys(window.mR.modules);
    }, moduleRaid.toString());

    expect(modules.length).to.be.greaterThanOrEqual(1);
  });

  it("can search for a module by direct property string", async function() {
    const results = await page.evaluate(() => {
      return window.mR.findModule("someKey");
    });

    expect(results.length).to.eql(1);
    expect(results[0]).to.have.own.property("someKey");
    expect(results[0].someKey).to.eql("someValue");
  });

  it("can search for a module by direct property string in defaults", async function() {
    const results = await page.evaluate(() => {
      return window.mR.findModule("someOtherKey");
    });

    expect(results.length).to.eql(1);
    expect(results[0].default).to.have.own.property("someOtherKey");
    expect(results[0].default.someOtherKey).to.eql("someOtherValue");
  });

  it("can search for a module by function", async function() {
    const results = await page.evaluate(() => {
      return window.mR.findModule(m => m.default && m.default.meaningOfLife === 42);
    });

    expect(results.length).to.eql(1);
    expect(results[0].default.meaningOfLife).to.eql(42);
  });

  it("returns empty array if no module is found by string", async function() {
    const results = await page.evaluate(() => {
      return window.mR.findModule("someModuleThatDoesNotExist");
    });

    expect(Array.isArray(results)).to.be.true;
    expect(results.length).to.eql(0);
  });

  it("returns empty array if no module is found by function", async function() {
    const results = await page.evaluate(() => {
      return window.mR.findModule(_ => false);
    });

    expect(Array.isArray(results)).to.be.true;
    expect(results.length).to.eql(0);
  });

  it("can get a module by id", async function() {
    const module = await page.evaluate((mId) => {
      return window.mR.get(mId);
    }, testModuleId);

    expect(typeof module).to.eql("object");
    expect(module.someKey).to.eql("someValue");
  });

  it("returns undefined when getting nonexistent module by id", async function() {
    const module = await page.evaluate(() => {
      return window.mR.get("someRandomModuleThatDoesntExist");
    });

    expect(module).to.be.undefined;
  })

  after(async function() {
    await browser.close();
  });
});