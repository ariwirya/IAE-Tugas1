class BookApp {
  constructor() {
    this.API_BOOK = "https://bukuacak-9bdcb4ef2605.herokuapp.com/api/v1/book";
    this.API_GENRE =
      "https://bukuacak-9bdcb4ef2605.herokuapp.com/api/v1/stats/genre";
    this.allBooks = []; // Simpan semua buku di sini
    this.filteredBooks = []; // Simpan hasil filter
    this.currentPage = 1;
    this.perPage = 20;
    this.currentKeyword = ""; // Menyimpan keyword terakhir untuk menjaga konsistensi

    this.dom = {
      searchInput: document.getElementById("searchInput"),
      genreFilter: document.getElementById("genreFilter"),
      bookGrid: document.getElementById("latestBooks"),
      pagination: document.getElementById("pagination"),
      modal: document.getElementById("bookModal"),
      modalTitle: document.getElementById("modalTitle"),
      modalAuthor: document.getElementById("modalAuthor"),
      modalDescription: document.getElementById("modalDescription"),
      modalYear: document.getElementById("modalYear"),
      modalGenre: document.getElementById("modalGenre"),
    };

    this.init();
  }

  async init() {
    await this.loadGenres();
    await this.loadInitialBooks(); // Muat semua buku di awal
    this.bindEvents();
  }

  async loadInitialBooks() {
    await this.loadBooks(); // Memuat semua buku tanpa filter di awal
  }

  async loadGenres() {
    try {
      const res = await fetch(this.API_GENRE);
      const data = await res.json();
      const genres = new Set();

      this.dom.genreFilter.innerHTML = `<option value="">Semua Genre</option>`;
      data.genre_statistics.forEach((item) => {
        const genre = item.genre?.trim();
        if (genre && !genres.has(genre)) {
          genres.add(genre);
          const opt = document.createElement("option");
          opt.value = genre;
          opt.textContent = genre;
          this.dom.genreFilter.appendChild(opt);
        }
      });
    } catch (e) {
      console.error("Gagal memuat genre", e);
    }
  }

  async loadBooks({ keyword = "", genre = "" } = {}) {
    if (keyword) {
      this.currentKeyword = keyword; // Menyimpan keyword terakhir
    }
    const years = [2024];
    const bookMap = new Map();

    for (const year of years) {
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const url = `${this.API_BOOK}?keyword=${encodeURIComponent(
          keyword
        )}&genre=${encodeURIComponent(
          genre
        )}&year=${year}&sort=desc&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.books?.length) {
          data.books.forEach((book) => bookMap.set(book._id, book));
          hasNext = data.pagination?.hasNextPage;
          page++;
        } else {
          hasNext = false;
        }
      }
    }

    this.allBooks = Array.from(bookMap.values()).sort(
      (a, b) =>
        new Date(b.details?.published_date || 0) -
        new Date(a.details?.published_date || 0)
    );
    this.filterBooks(this.currentKeyword); // Saring buku setiap kali loadBooks terpanggil
    this.currentPage = 1;
    this.render();
  }

  filterBooks(keyword) {
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      this.filteredBooks = this.allBooks.filter((book) =>
        book.title.toLowerCase().includes(keywordLower)
      );
    } else {
      this.filteredBooks = [...this.allBooks]; // Salin semua buku jika tidak ada keyword
    }
  }

  render() {
    this.renderBooks();
    this.renderPagination();
  }

  renderBooks() {
    const start = (this.currentPage - 1) * this.perPage;
    const end = start + this.perPage;
    const items = this.filteredBooks.slice(start, end); // Menggunakan filteredBooks
    const isGenreFiltered = this.dom.genreFilter.value !== "";
    this.dom.bookGrid.innerHTML = "";

    if (items.length === 0) {
      this.dom.bookGrid.innerHTML = `<p style="text-align:center; color:gray;">
            ${
              isGenreFiltered
                ? "Genre tidak ditemukan."
                : "Tidak ada buku ditemukan."
            }
          </p>`;
      return;
    }

    items.forEach((book) => {
      const card = document.createElement("div");
      card.className = "book-card";
      card.innerHTML = `
            <img src="${
              book.cover_image || "https://via.placeholder.com/200x250"
            }" class="book-cover">
            <div class="book-title">${book.title}</div>
          `;
      card.onclick = () => this.showModal(book);
      this.dom.bookGrid.appendChild(card);
    });
  }

  renderPagination() {
    const totalPages = Math.ceil(this.filteredBooks.length / this.perPage); // Menggunakan filteredBooks
    this.dom.pagination.innerHTML = "";

    const createBtn = (txt, cb, dis = false, act = false) => {
      const b = document.createElement("button");
      b.textContent = txt;
      if (dis) b.disabled = true;
      if (act) b.classList.add("active");
      b.onclick = cb;
      return b;
    };

    this.dom.pagination.appendChild(
      createBtn(
        "⬅️",
        () => this.changePage(this.currentPage - 1),
        this.currentPage === 1
      )
    );

    const range = this.getPaginationRange(totalPages);
    range.forEach((p) => {
      if (p === "...") this.dom.pagination.appendChild(this.createDots());
      else
        this.dom.pagination.appendChild(
          createBtn(p, () => this.changePage(p), false, p === this.currentPage)
        );
    });

    this.dom.pagination.appendChild(
      createBtn(
        "➡️",
        () => this.changePage(this.currentPage + 1),
        this.currentPage === totalPages
      )
    );
  }

  getPaginationRange(total) {
    const range = [];
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(total, this.currentPage + 2);
    if (start > 1) {
      range.push(1);
      if (start > 2) range.push("...");
    }
    for (let i = start; i <= end; i++) range.push(i);
    if (end < total) {
      if (end < total - 1) range.push("...");
      range.push(total);
    }
    return range;
  }

  createDots() {
    const span = document.createElement("span");
    span.textContent = "...";
    return span;
  }

  changePage(p) {
    this.currentPage = p;
    this.render();
  }

  showModal(book) {
    this.dom.modalTitle.textContent = book.title;
    this.dom.modalAuthor.textContent = book.author?.name || "-";
    this.dom.modalDescription.textContent = book.summary || "-";
    this.dom.modalYear.textContent = book.details?.published_date || "-";
    this.dom.modalGenre.textContent = book.category?.name || "-";
    this.dom.modal.style.display = "block";
  }

  bindEvents() {
    this.dom.searchInput.addEventListener("input", () => {
      const keyword = this.dom.searchInput.value.trim();
      this.loadBooks({ keyword }); // Hanya keyword, genre disaring di API
    });

    this.dom.genreFilter.addEventListener("change", () => {
      const keyword = this.dom.searchInput.value.trim();
      const genre = this.dom.genreFilter.value;
      this.loadBooks({ keyword, genre });
    });

    window.onclick = (e) => {
      if (e.target === this.dom.modal) this.dom.modal.style.display = "none";
    };
  }
}

new BookApp();
