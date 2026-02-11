# Production Report System

A web-based production reporting system built using Google Apps Script and Google Sheets.

This system replaces manual paper-based shift reporting with a centralized digital workflow for manufacturing environments.

---

## 🚀 Features

- Shift-wise production data entry
- Automatic target calculation (Manpower × Output per Man)
- Efficiency tracking per shift
- Duplicate submission protection
- Date locking (prevents backdated entry)
- Uppercase remark enforcement
- Missing report detection
- Admin-side Missing Report builder
- Time-driven email alerts (optional)
- Concurrency-safe write operations using LockService

---

## 🏗 Architecture

**Frontend:** HTML/CSS (Google Apps Script Web App)  
**Backend:** Google Apps Script  
**Database:** Google Sheets  

Data is stored in structured vertical format to allow scalability and dashboard generation.

---

## 📊 Data Structure

### MASTER Sheet

| Prod. Line | VIN Code | Output Per Man |

---

### Production_Data Sheet

| Date | VIN Code | Prod. Line | Shift Data Columns... |

Shift data includes:
- Deploy Manpower
- Calculated Target
- Achieved
- Remark (Auto Uppercase)
- Recorder Name

---

## 📈 Dashboard Capability

The system supports:
- Daily efficiency calculation
- Line-wise performance comparison
- Shift-wise summaries
- Missing report monitoring

---

## 🔒 Governance Controls

- LockService prevents duplicate concurrent submissions
- Past date entries restricted
- Duplicate shift submission prevention
- Admin-triggered Missing Report generation
- Optional automated daily email alerts

---

## 🛠 Deployment

1. Open Google Sheets
2. Extensions → Apps Script
3. Paste `Code.gs` and `index.html`
4. Deploy as Web App
5. Set:
   - Execute as: Me
   - Access: Anyone 

---

## 📦 Future Roadmap

- Hourly reporting model (vertical structure)
- Dashboard UI integration
- Automated shift-based missing detection
- PWA upgrade path
- Database migration (Firestore/PostgreSQL)

---

## 📄 License

Internal Manufacturing Use Only.
