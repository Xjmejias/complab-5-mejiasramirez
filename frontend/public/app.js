async function placeOrder() {

    const product = document.getElementById("product").value;
    const amount = document.getElementById("amount").value;

    const result = document.getElementById("result");

    if (!product || !amount) {
        result.textContent = "Please enter product and amount.";
        result.style.color = "red";
        return;
    }

    try {

        const response = await fetch("/api/orders", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                product: product,
                amount: Number(amount)
            })
        });

        const data = await response.json();

        result.textContent =
            "Order placed successfully! Order ID: " + data.orderId;

        result.style.color = "green";

    } catch (error) {

        console.error(error);

        result.textContent =
            "Failed to place order.";

        result.style.color = "red";
    }
}
