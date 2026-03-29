import { test, expect, requireEnv } from "./fixtures";

// ---------------------------------------------------------------------------
// Asset Families
// ---------------------------------------------------------------------------

test.describe("Asset Families", () => {
    test("lists families and navigates to detail", async ({ authedPage: page }) => {
        await page.goto("/assets", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /asset families/i })).toBeVisible();
        await expect(page.getByTestId("family-list")).toBeVisible();

        const firstFamilyLink = page.locator('a[href^="/assets/families/"]').first();
        await expect(firstFamilyLink).toBeVisible();

        const firstFamilyName = (await firstFamilyLink.locator("h3").first().textContent())?.trim();
        await firstFamilyLink.click();

        await expect(page).toHaveURL(/\/assets\/families\//);
        if (firstFamilyName) {
            await expect(page.getByRole("heading", { name: firstFamilyName })).toBeVisible();
        }
    });

    test("family detail shows availability stats and stock records", async ({
        authedPage: page,
    }) => {
        await page.goto("/assets", { waitUntil: "domcontentloaded" });
        await page.locator('a[href^="/assets/families/"]').first().click();
        await expect(page).toHaveURL(/\/assets\/families\//);

        await expect(page.getByTestId("family-availability-stats")).toBeVisible();
        await expect(page.getByTestId("family-stock-list")).toBeVisible();
    });

    test("family detail has action buttons", async ({ authedPage: page }) => {
        await page.goto("/assets", { waitUntil: "domcontentloaded" });
        await page.locator('a[href^="/assets/families/"]').first().click();
        await expect(page).toHaveURL(/\/assets\/families\//);

        await expect(page.getByTestId("family-add-stock-btn")).toBeVisible();
        await expect(page.getByTestId("family-edit-btn")).toBeVisible();
        await expect(page.getByTestId("family-delete-btn")).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

test.describe("Collections", () => {
    test("collection detail shows items with family links", async ({ authedPage: page }) => {
        const collectionId = requireEnv("WAREHOUSE_COLLECTION_SMOKE_ID");
        await page.goto(`/collections/${collectionId}`, {
            waitUntil: "domcontentloaded",
        });
        await expect(page.getByRole("heading", { name: /collection items/i })).toBeVisible();
        await expect(page.locator('a[href^="/assets/families/"]').first()).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

test.describe("Conditions", () => {
    test("condition management page loads with family cards", async ({ authedPage: page }) => {
        await page.goto("/conditions", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /condition management/i })).toBeVisible();
        await expect(page.getByTestId("condition-family-list")).toBeVisible();
        await expect(page.getByTestId("condition-family-card").first()).toBeVisible();
    });
});
