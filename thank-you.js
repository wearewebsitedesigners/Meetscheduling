document.addEventListener("DOMContentLoaded", () => {
    const titleEl = document.getElementById("event-title");
    const datetimeEl = document.getElementById("event-datetime");
    const timezoneEl = document.getElementById("event-timezone");

    try {
        const dataStr = sessionStorage.getItem("meetscheduling_last_booking");
        if (!dataStr) {
            titleEl.textContent = "Booking Confirmed";
            datetimeEl.textContent = "Check your email for details.";
            timezoneEl.textContent = "";
            return;
        }

        const data = JSON.parse(dataStr);
        const booking = data.booking;
        const event = data.event;

        titleEl.textContent = event.title || "Meeting scheduled";
        datetimeEl.textContent = `${booking.startLocal.time} - ${booking.endLocal.time}, ${booking.startLocal.date}`;
        timezoneEl.textContent = booking.visitorTimezone || "UTC";

    } catch (err) {
        console.error(err);
        titleEl.textContent = "Booking Confirmed";
        datetimeEl.textContent = "Check your email for details.";
    }
});
