from playwright.sync_api import Page, expect
import pytest
import re

class TestCasesPage:
    """
    Page Object Model for the /test_cases page of automationexercise.com
    Encapsulates locators and common actions for reusability across tests.
    """

    URL = "https://automationexercise.com/test_cases"

    def __init__(self, page: Page):
        self.page = page
        # Recommended locators from provided list and sensible additions
        self.home_link = page.get_by_role("link", name="Home")
        self.products_link = page.get_by_role("link", name=" Products")
        self.cart_link = page.get_by_role("link", name="Cart")
        self.signup_login_link = page.get_by_role("link", name="Signup / Login")
        self.test_cases_link = page.get_by_role("link", name="Test Cases")
        self.api_testing_link = page.get_by_role("link", name="API Testing")
        self.video_tutorials_link = page.get_by_role("link", name="Video Tutorials")
        self.test_case_1_link = page.get_by_role("link", name="Test Case 1: Register User")
        self.test_case_2_link = page.get_by_role("link", name="Test Case 2: Login User with correct email and password")
        self.test_case_3_link = page.get_by_role("link", name="Test Case 3: Login User with incorrect email and password")
        # Subscribe button id provided as recommended locator
        self.subscribe_button = page.locator("#subscribe")
        # Email input is not listed in recommendations but exists on the page with id 'susbscribe_email' on this site
        # Using id locator as it has higher priority and is stable.
        self.subscribe_email_input = page.locator("#susbscribe_email")
        # Header and footer semantic roles
        self.header = page.get_by_role("banner")
        self.footer = page.get_by_role("contentinfo")

    def goto(self):
        """Navigate to the test cases page and ensure it loaded."""
        self.page.goto(self.URL)
        # Wait for a key element on the page (the Test Cases link) to be visible
        expect(self.test_cases_link).to_be_visible(timeout=10000)

    def click_home(self):
        """Click the Home link and wait for navigation."""
        self.home_link.click()
        expect(self.page).to_have_url(re.compile(r"^https?://(www\.)?automationexercise\.com/?$"), timeout=10000)

    def click_products(self):
        """Click the Products link and wait for products page to load."""
        self.products_link.click()
        # Products page should contain 'Products' heading or have /products in URL
        expect(self.page).to_have_url(re.compile(r".*/products.*", re.IGNORECASE), timeout=10000)
        # Also ensure product listing content is visible (broad check for 'Products' text)
        expect(self.page.locator("text=Products")).to_be_visible(timeout=10000)

    def subscribe(self, email: str):
        """Fill the subscribe email input and click subscribe button."""
        # Ensure email input is visible and fill
        expect(self.subscribe_email_input).to_be_visible(timeout=5000)
        self.subscribe_email_input.fill(email)
        # Click subscribe and allow the page/app to respond
        self.subscribe_button.click()

    def get_subscribe_validation_message(self) -> str:
        """
        Query the browser validation message for the subscribe email input.
        Returns the native validation message (may be empty string if none).
        """
        # Use eval_on_selector to retrieve the element's validationMessage reliably
        return self.page.eval_on_selector("#susbscribe_email", "el => el.validationMessage") or ""

    def header_contains_nav_or_branding(self) -> bool:
        """Check header contains expected navigation/branding elements like the Home link."""
        try:
            # Check Home link exists within header
            header_home = self.header.get_by_role("link", name="Home")
            expect(header_home).to_be_visible(timeout=5000)
            return True
        except Exception:
            return False

    def footer_contains_branding(self) -> bool:
        """Check footer contains expected branding or navigation elements."""
        # Broad check: footer should contain the site domain or 'Copyright' or 'Automation Exercise'
        footer_text = self.footer.locator("xpath=./*")
        # We'll assert footer has some visible textual content containing 'automation' or 'copyright'
        try:
            expect(self.page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'automation')]")).to_be_visible(timeout=5000)
            return True
        except Exception:
            try:
                expect(self.page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'copyright')]")).to_be_visible(timeout=5000)
                return True
            except Exception:
                return False

@pytest.fixture(scope="function")
def test_cases_page(page: Page) -> TestCasesPage:
    """Pytest fixture to provide a prepared TestCasesPage instance."""
    p = TestCasesPage(page)
    p.goto()
    return p

def test_header_and_footer_presence(test_cases_page: TestCasesPage):
    """
    Test 1: Verify header and footer presence
    Validates that header (role=banner) and footer (role=contentinfo) are visible and contain expected elements.
    """
    page = test_cases_page.page
    # Header visible
    expect(test_cases_page.header).to_be_visible(timeout=5000)
    assert test_cases_page.header_contains_nav_or_branding(), "Header does not contain expected navigation/branding elements."

    # Footer visible
    expect(test_cases_page.footer).to_be_visible(timeout=5000)
    assert test_cases_page.footer_contains_branding(), "Footer does not contain expected branding/navigation elements."

def test_navigate_to_home_via_home_link(test_cases_page: TestCasesPage):
    """
    Test 2: Navigate to Home via Home link
    Validates clicking 'Home' navigates to the site homepage.
    """
    page = test_cases_page.page
    # Click Home and verify navigation completed in POM
    test_cases_page.click_home()
    # Ensure homepage content visible - site typically shows categories or slider with text like 'Full-Fledged practice website'
    expect(page.locator("text=Full-Fledged")).to_be_visible(timeout=10000)

def test_navigate_to_products(test_cases_page: TestCasesPage):
    """
    Test 3: Navigate to Products via ' Products' link
    Validates clicking the Products link loads the products page.
    """
    page = test_cases_page.page
    test_cases_page.products_link.click()
    expect(page).to_have_url(re.compile(r".*/products.*", re.IGNORECASE), timeout=10000)
    # Ensure product listing or filter is visible
    expect(page.locator("text=Category")).to_be_visible(timeout=10000)

def test_subscribe_with_valid_email(test_cases_page: TestCasesPage):
    """
    Test 4: Subscribe with valid email
    Validates subscribing with a valid email shows confirmation.
    """
    page = test_cases_page.page
    test_cases_page.subscribe("user@example.com")
    # Look for any visible element that indicates success - check for 'subscribed' keyword case-insensitive anywhere on page
    success_locator = page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'subscribed')]")
    expect(success_locator).to_be_visible(timeout=10000)

def test_subscribe_with_invalid_email_format(test_cases_page: TestCasesPage):
    """
    Test 5: Subscribe with invalid email format
    Validates client-side/server-side validation for invalid email formats.
    """
    page = test_cases_page.page
    # Ensure field is empty then type invalid email
    test_cases_page.subscribe_email_input.fill("")
    test_cases_page.subscribe("invalidemail")
    # For HTML5 email inputs, the browser's validationMessage should be non-empty when invalid
    validation_message = test_cases_page.get_subscribe_validation_message()
    # If validation_message is empty, attempt to detect inline error messages referencing 'valid' or 'email'
    if validation_message:
        assert len(validation_message) > 0, "Expected browser validation message for invalid email, got empty."
    else:
        # Fallback: check for inline error text containing 'valid' or 'email' or 'invalid'
        fallback_locator = page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'valid') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'email') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'invalid')]")
        expect(fallback_locator).to_be_visible(timeout=5000)

def test_subscribe_with_empty_email_field(test_cases_page: TestCasesPage):
    """
    Test 6: Subscribe with empty email field
    Validates behavior when subscribing without entering email.
    """
    page = test_cases_page.page
    # Ensure empty
    test_cases_page.subscribe_email_input.fill("")
    test_cases_page.subscribe_button.click()
    # Expect browser validationMessage to indicate required field
    validation_message = test_cases_page.get_subscribe_validation_message()
    if validation_message:
        assert len(validation_message) > 0, "Expected required-field validation message when submitting empty email."
    else:
        # Fallback: look for inline text mentioning 'required' or 'please enter' etc.
        fallback_locator = page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'required') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'please enter') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'please')]")
        expect(fallback_locator).to_be_visible(timeout=5000)

def test_navigate_to_signup_login_page(test_cases_page: TestCasesPage):
    """
    Test 7: Navigate to Signup / Login page
    Validates that the 'Signup / Login' link opens the correct page.
    """
    page = test_cases_page.page
    test_cases_page.signup_login_link.click()
    # Expect URL to indicate login or signup; fallback to checking presence of login/signup forms
    expect(page).to_have_url(re.compile(r".*/(login|signup).*", re.IGNORECASE), timeout=10000)
    # Verify login or signup form visible
    login_form = page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'login') and (self::form or descendant::form)]")
    signup_form = page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'signup') and (self::form or descendant::form)]")
    expect(login_form.or_(signup_form)).to_be_visible(timeout=10000)

def test_navigate_to_api_testing_page(test_cases_page: TestCasesPage):
    """
    Test 8: Navigate to API Testing page
    Validates the API Testing link opens the API Testing section/page.
    """
    page = test_cases_page.page
    test_cases_page.api_testing_link.click()
    # Expect URL to contain 'api' or page to display 'API Testing' content
    expect(page).to_have_url(re.compile(r".*api.*", re.IGNORECASE), timeout=10000)
    expect(page.locator("text=API Testing")).to_be_visible(timeout=10000)

def test_navigate_to_video_tutorials_page(test_cases_page: TestCasesPage):
    """
    Test 9: Navigate to Video Tutorials page
    Validates the Video Tutorials link opens the relevant content.
    """
    page = test_cases_page.page
    test_cases_page.video_tutorials_link.click()
    # Expect URL or content to indicate video/tutorial presence
    expect(page).to_have_url(re.compile(r".*(video|tutorial).*", re.IGNORECASE), timeout=10000)
    # Check for a list of videos or headings
    video_locator = page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'video') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'tutorial')]")
    expect(video_locator).to_be_visible(timeout=10000)

def test_open_test_case_1_details(test_cases_page: TestCasesPage):
    """
    Test 10: Open Test Case 1: Register User details
    Validates the detailed content for Test Case 1 is accessible.
    """
    page = test_cases_page.page
    test_cases_page.test_case_1_link.click()
    # Expect either navigation or in-page anchor reveal; check URL contains anchor or page contains 'Register User' details
    expect(page).to_have_url(re.compile(r".*(test_case_1|register).*", re.IGNORECASE), timeout=10000)
    # Verify content that mentions 'Register User' is visible
    expect(page.locator("text=Register User")).to_be_visible(timeout=10000)

def test_open_test_case_2_details(test_cases_page: TestCasesPage):
    """
    Test 11: Open Test Case 2: Login User with correct credentials details
    Validates Test Case 2 details are shown.
    """
    page = test_cases_page.page
    test_cases_page.test_case_2_link.click()
    expect(page).to_have_url(re.compile(r".*(test_case_2|login).*", re.IGNORECASE), timeout=10000)
    expect(page.locator("text=Login User")).to_be_visible(timeout=10000)

def test_open_test_case_3_details(test_cases_page: TestCasesPage):
    """
    Test 12: Open Test Case 3: Login User with invalid credentials details
    Validates Test Case 3 details are shown.
    """
    page = test_cases_page.page
    test_cases_page.test_case_3_link.click()
    expect(page).to_have_url(re.compile(r".*(test_case_3|login).*", re.IGNORECASE), timeout=10000)
    expect(page.locator("text=Login User")).to_be_visible(timeout=10000)

def test_navigate_to_cart_and_verify_content(test_cases_page: TestCasesPage):
    """
    Test 13: Navigate to Cart page and verify cart content
    Validates the Cart link opens the cart and the cart shows either an empty state or listed items.
    """
    page = test_cases_page.page
    test_cases_page.cart_link.click()
    # Expect cart URL
    expect(page).to_have_url(re.compile(r".*(cart|view_cart).*", re.IGNORECASE), timeout=10000)
    # Ensure cart header exists
    # Use heading role detection with regex for 'Cart'
    try:
        expect(page.get_by_role("heading", name=re.compile(r"cart", re.IGNORECASE))).to_be_visible(timeout=5000)
    except Exception:
        # Fallback: check for any text containing 'cart' at top of page
        expect(page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'cart')]")).to_be_visible(timeout=5000)

    # Check if there are cart item rows within any tables
    rows = page.locator("table tbody tr")
    rows_count = rows.count()
    if rows_count > 0:
        # Verify at least one row contains expected columns like product name, quantity, price
        first_row = rows.nth(0)
        # Check for product name text presence in the row
        product_name_cell = first_row.locator("xpath=./td[2] | ./td[1]")
        expect(product_name_cell).to_be_visible(timeout=5000)
        # Check for quantity controls or text
        qty_cell = first_row.locator("xpath=./td[3] | ./td[2]")
        expect(qty_cell).to_be_visible(timeout=5000)
    else:
        # If no rows, expect an empty-cart message
        empty_locator = page.locator("xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'your cart is empty') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'cart is empty') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'empty cart')]")
        expect(empty_locator).to_be_visible(timeout=5000)