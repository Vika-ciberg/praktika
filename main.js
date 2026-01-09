// === 1. ДАНІ ТА ІНІЦІАЛІЗАЦІЯ ===
const defaultUsers = { "admin": { pass: "1234", name: "Адміністратор" } };
let usersDB = JSON.parse(localStorage.getItem('rentCarUsers')) || defaultUsers;

const defaultCars = [
    { id: 1, model: "Toyota Camry", year: 2020, price: 50, owner: "Олег", ownerLogin: "oleg", phone: "099-123-45-67", image: "https://placehold.co/400x250?text=Toyota", isBooked: false, bookedBy: null },
    { id: 2, model: "BMW X5", year: 2022, price: 120, owner: "Анна", ownerLogin: "anna", phone: "097-987-65-43", image: "https://placehold.co/400x250?text=BMW", isBooked: false, bookedBy: null },
    { id: 3, model: "Audi Q7", year: 2021, price: 100, owner: "Олег", ownerLogin: "oleg", phone: "111-111", image: "https://placehold.co/400x250?text=Audi", isBooked: false, bookedBy: null },
    { id: 4, model: "Tesla Model 3", year: 2023, price: 90, owner: "Ілон", ownerLogin: "elon", phone: "222-222", image: "https://placehold.co/400x250?text=Tesla", isBooked: false, bookedBy: null },
    { id: 5, model: "Lanos", year: 2008, price: 20, owner: "Вадим", ownerLogin: "vasya", phone: "333-333", image: "https://placehold.co/400x250?text=Lanos", isBooked: false, bookedBy: null },
    { id: 6, model: "Porsche Cayenne", year: 2022, price: 150, owner: "Анна", ownerLogin: "anna", phone: "444-444", image: "https://placehold.co/400x250?text=Porsche", isBooked: false, bookedBy: null },
    { id: 7, model: "Honda Civic", year: 2019, price: 40, owner: "Олег", ownerLogin: "oleg", phone: "555-555", image: "https://placehold.co/400x250?text=Honda", isBooked: false, bookedBy: null }
];
// Ось цей рядок критично важливий для відновлення списку!
let cars = JSON.parse(localStorage.getItem('rentCarCars')) || defaultCars;

let currentUserLogin = null;
let currentUserName = null;
let isLoginMode = true;
let bookingModal, editModal;
let selectedCarId;

// Налаштування пагінації
let currentPage = 1;
const itemsPerPage = 6; 

// === 2. АВТОМАТИЧНИЙ ВХІД (СЕСІЯ - ЗАВДАННЯ 10) ===
// Перевіряємо, чи ми вже входили раніше
const savedSession = JSON.parse(localStorage.getItem('rentCarSession'));
if (savedSession) {
    // Якщо так - одразу заходимо
    enterApp(savedSession.login, savedSession.name);
}

function saveData() {
    try {
        localStorage.setItem('rentCarUsers', JSON.stringify(usersDB));
        localStorage.setItem('rentCarCars', JSON.stringify(cars));
    } catch (e) { alert("Помилка збереження даних (пам'ять переповнена)"); }
}

// === 3. ЛОГІКА ВХОДУ ТА РЕЄСТРАЦІЇ ===
document.getElementById('toggleAuthBtn')?.addEventListener('click', (e) => {
    e.preventDefault(); isLoginMode = !isLoginMode;
    document.getElementById('fullNameGroup').classList.toggle('d-none', isLoginMode);
    document.getElementById('authTitle').innerText = isLoginMode ? "Вхід" : "Реєстрація";
    document.getElementById('authBtn').innerText = isLoginMode ? "Увійти" : "Зареєструватися";
    e.target.innerText = isLoginMode ? "Зареєструватися" : "Увійти";
});

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const login = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const name = document.getElementById('fullName').value.trim();
    const errorBox = document.getElementById('loginError');
    errorBox.classList.add('d-none');

    try {
        if (!login || !pass) throw new Error("Заповніть усі поля!");
        if (isLoginMode) {
            if (usersDB[login] && usersDB[login].pass === pass) enterApp(login, usersDB[login].name);
            else throw new Error("Невірний логін або пароль!");
        } else {
            if (usersDB[login]) throw new Error("Цей логін вже зайнятий!");
            if (!name) throw new Error("Введіть ваше ПІБ!");
            usersDB[login] = { pass, name };
            saveData();
            enterApp(login, name);
        }
    } catch (err) {
        errorBox.innerText = err.message;
        errorBox.classList.remove('d-none');
    }
});

function enterApp(login, name) {
    currentUserLogin = login;
    currentUserName = name;

    // ЗБЕРІГАЄМО СЕСІЮ (Щоб після F5 не вибивало)
    localStorage.setItem('rentCarSession', JSON.stringify({ login, name }));

    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('app-screen').classList.remove('d-none');
    document.getElementById('userDisplay').innerText = name;
    document.getElementById('addCarPanel').classList.remove('d-none');
    
    // Запускаємо все
    renderCars();
    loadCurrency();
    loadBlogPosts();
}

function logout() { 
    // ВИДАЛЯЄМО СЕСІЮ при виході
    localStorage.removeItem('rentCarSession');
    location.reload(); 
}

// === 4. ВІДОБРАЖЕННЯ СПИСКУ АВТО (РЕНДЕРИНГ) ===
function renderCars() {
    console.time("Швидкість рендеру");

    const grid = document.getElementById('carsGrid');
    const paginationContainer = document.getElementById('paginationContainer');
    
    // Якщо елементів немає в HTML (наприклад, ми ще на екрані логіну), виходимо
    if(!grid) return;

    grid.innerHTML = '';
    
    // 1. Пошук
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filtered = cars.filter(c => c.model.toLowerCase().includes(search));

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="alert alert-warning w-100">Авто не знайдено</div>';
        paginationContainer.innerHTML = '';
        return;
    }

    // 2. Пагінація
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const carsToShow = filtered.slice(startIndex, endIndex);

    // 3. Малювання карток
    carsToShow.forEach(car => {
        const div = document.createElement('div');
        div.className = 'col';
        let buttonsHtml = '';

        // ЛОГІКА КНОПОК
        if (car.ownerLogin === currentUserLogin || currentUserLogin === 'admin') {
            // ВЛАСНИК
            if (car.isBooked) {
                buttonsHtml = `
                    <div class="d-grid gap-2">
                        <button class="btn btn-success" onclick="cancelBooking(${car.id})">Підтвердити повернення</button>
                        <div class="d-flex gap-2">
                             <button class="btn btn-secondary w-50" disabled>Зедагувати</button>
                             <button class="btn btn-outline-danger w-50" onclick="deleteCar(${car.id})">Видалити</button>
                        </div>
                    </div>`;
            } else {
                buttonsHtml = `
                    <div class="d-flex gap-2">
                        <button class="btn btn-warning w-50" onclick="openEditModal(${car.id})">Зедагувати</button>
                        <button class="btn btn-outline-danger w-50" onclick="deleteCar(${car.id})">Видалити</button>
                    </div>`;
            }
        } else {
            // КЛІЄНТ
            if (car.isBooked) {
                if (car.bookedBy === currentUserLogin) {
                    buttonsHtml = `<button class="btn btn-danger w-100" onclick="cancelBooking(${car.id})">Скасувати бронь</button>`;
                } else {
                    buttonsHtml = `<button class="btn btn-secondary w-100" disabled>Зайнято</button>`;
                }
            } else {
                buttonsHtml = `<button class="btn btn-primary w-100" onclick="openBookingModal(${car.id})">Орендувати</button>`;
            }
        }

        // ЛОГІКА СТИЛІВ (Сірий колір)
        let bookedClass = '';
        // Сірий тільки якщо зайнято, і це НЕ моє авто і НЕ моя бронь
        if (car.isBooked) {
            if (car.ownerLogin === currentUserLogin || car.bookedBy === currentUserLogin) {
                bookedClass = ''; 
            } else {
                bookedClass = 'booked'; 
            }
        }

        const myBookingClass = (car.bookedBy === currentUserLogin) ? 'border-success border-2' : '';
        const ownerViewClass = (car.ownerLogin === currentUserLogin && car.isBooked) ? 'border-warning border-2' : '';

        div.innerHTML = `
            <div class="card h-100 car-card ${bookedClass} ${myBookingClass} ${ownerViewClass}">
                <img src="${car.image}" class="car-img" alt="${car.model}">
                <div class="card-body">
                    <div class="d-flex justify-content-between"><h5 class="fw-bold">${car.model}</h5><span class="badge bg-success">$${car.price}</span></div>
                    <p class="text-muted small">Рік: ${car.year} | Власник: ${car.owner}</p>
                    ${car.bookedBy === currentUserLogin ? '<p class="text-success fw-bold small">Ви забронювали це авто</p>' : ''}
                    ${(car.ownerLogin === currentUserLogin && car.isBooked) ? '<p class="text-warning fw-bold small">Клієнт забронював авто</p>' : ''}
                </div>
                <div class="card-footer bg-white border-0 pt-0 pb-3">${buttonsHtml}</div>
            </div>`;
        grid.appendChild(div);
    });

    renderPagination(totalPages);

    console.timeEnd("Швидкість рендеру");
}

// === 5. ДОПОМІЖНІ ФУНКЦІЇ ===

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<ul class="pagination">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><button class="page-link" onclick="changePage(${currentPage - 1})">←</button></li>`;
    html += `<li class="page-item disabled"><span class="page-link">${currentPage} / ${totalPages}</span></li>`;
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><button class="page-link" onclick="changePage(${currentPage + 1})">→</button></li>`;
    html += `</ul>`;
    container.innerHTML = html;
}

window.changePage = function(newPage) {
    currentPage = newPage;
    renderCars();
    document.getElementById('listContainer').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('searchInput')?.addEventListener('input', () => { currentPage = 1; renderCars(); });

// Додавання авто
document.getElementById('addCarForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    try {
        const model = document.getElementById('carModel').value;
        const year = document.getElementById('carYear').value;
        const price = document.getElementById('carPrice').value;
        
        if(parseInt(price) <= 0) throw new Error("Ціна має бути більше 0");
        if(model.length < 2) throw new Error("Введіть коректну модель");

        cars.unshift({ 
            id: Date.now(),
            model: model,
            year: year,
            price: price,
            owner: currentUserName, 
            ownerLogin: currentUserLogin,
            phone: document.getElementById('carPhone').value,
            image: document.getElementById('carImage').value || "https://placehold.co/400x250?text=Auto",
            isBooked: false,
            bookedBy: null
        });
        saveData();
        currentPage = 1;
        renderCars();
        e.target.reset();
        alert("Авто успішно додано!");
    } catch(err) { alert(err.message); }
});

window.deleteCar = function(id) { if(confirm('Видалити оголошення?')) { cars = cars.filter(c => c.id !== id); saveData(); renderCars(); } };

// Бронювання та Скасування
window.openBookingModal = function(id) { 
    if (!bookingModal) bookingModal = new bootstrap.Modal(document.getElementById('bookingModal')); 
    selectedCarId = id; 
    const car = cars.find(c => c.id === id); 
    document.getElementById('modalCarName').innerText = car.model; 
    document.getElementById('modalOwner').innerText = car.owner; 
    document.getElementById('modalPrice').innerText = car.price; 
    bookingModal.show(); 
};

window.confirmBooking = function() { 
    const car = cars.find(c => c.id === selectedCarId); 
    if(car) { 
        car.isBooked = true; 
        car.bookedBy = currentUserLogin; 
        saveData(); 
        renderCars(); 
        bookingModal.hide(); 
        alert(`Успішно! Зв'яжіться з власником: ${car.phone}`);
    } 
};

window.cancelBooking = function(id) {
    const car = cars.find(c => c.id === id);
    let message = "Скасувати бронювання?";
    if (car.ownerLogin === currentUserLogin) message = "Підтвердити повернення автомобіля?";

    if(confirm(message)) {
        if(car) {
            car.isBooked = false;
            car.bookedBy = null;
            saveData();
            renderCars();
            if (currentUserLogin === car.ownerLogin) alert("Авто повернуто!");
            else alert("Бронювання скасовано.");
        }
    }
};

// Редагування
window.openEditModal = function(id) { if (!editModal) editModal = new bootstrap.Modal(document.getElementById('editCarModal')); selectedCarId = id; const car = cars.find(c => c.id === id); document.getElementById('editModel').value = car.model; document.getElementById('editYear').value = car.year; document.getElementById('editPrice').value = car.price; document.getElementById('editPhone').value = car.phone; document.getElementById('editImage').value = car.image; editModal.show(); };
window.saveEditedCar = function() { const car = cars.find(c => c.id === selectedCarId); car.model = document.getElementById('editModel').value; car.year = document.getElementById('editYear').value; car.price = document.getElementById('editPrice').value; car.phone = document.getElementById('editPhone').value; car.image = document.getElementById('editImage').value; saveData(); renderCars(); editModal.hide(); };

// === 6. API БЛОГ ТА ВАЛЮТА ===
async function loadBlogPosts() {
    const grid = document.getElementById('blogGrid');
    const loader = document.getElementById('blogLoader');
    if(!grid) return; // Захист
    
    const uaPosts = [
        {
            title: "Як підготувати авто до зими?",
            body: "Заміна шин, перевірка акумулятора та вибір правильного антифризу. Поради експертів для безпечної їзди в холодну пору року."
        },
        {
            title: "Економія пального: Топ-5 порад",
            body: "Як стиль водіння впливає на витрати? Розвінчуємо міфи про економію та розповідаємо про реальні способи зберегти кошти."
        },
        {
            title: "Що робити при ДТП? Покрокова інструкція",
            body: "Не панікуйте! Алгоритм дій: виклик поліції, оформлення європротоколу та звернення до страхової компанії."
        }
    ];

    grid.innerHTML = ''; loader.classList.remove('d-none');
    try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts?_limit=3');
        response.data.forEach((post, i) => {
            const title = uaPosts[i] ? uaPosts[i].title : post.title;
            const body = uaPosts[i] ? uaPosts[i].body : post.body;
            const div = document.createElement('div');
            div.className = 'col';
            div.innerHTML = `<div class="card h-100 shadow-sm border-0"><div class="card-body"><h5 class="card-title fw-bold text-primary">${title}</h5><p class="card-text text-muted">${body}</p><button class="btn btn-sm btn-outline-primary mt-2">Читати далі</button></div></div>`;
            grid.appendChild(div);
        });
    } catch (e) { console.error(e); } finally { loader.classList.add('d-none'); }
}

document.getElementById('subscribeForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    axios.post('https://jsonplaceholder.typicode.com/posts', {email: document.getElementById('subEmail').value})
    .then(res => { alert(`Підписано! ID: ${res.data.id}`); e.target.reset(); })
    .catch(err => alert("Помилка"));
});

function loadCurrency() {
    axios.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json')
        .then(res => { const usd = res.data.find(x => x.cc === 'USD'); if(usd) document.getElementById('currencyRate').innerText = `💵 USD: ${usd.rate.toFixed(2)}`; })
        .catch(() => {});
}
