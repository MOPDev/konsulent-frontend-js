# Knowledge: Konsulent Frontend JS

## Backend Context

- Backend: Go/Gin + GORM + SQL Server
- Backend repo: `C:\Users\mkk\go\src\github.com\markuskjeldsen\mop-backend-api`
- API base: `/api/v1` or `/api/v2`

## Visit Grouping (group_id)

Visits can be grouped for coordinated planning. Each group has:

- A unique `group_id` (positive integer)
- Same `visit_date` for all visits in a group
- Same `user_id` (konsulent) for all visits in a group

### Group API Endpoints

| Method | Endpoint                           | Auth  | Description                       |
| ------ | ---------------------------------- | ----- | --------------------------------- |
| GET    | `/visits/group/:groupId/planned`   | Admin | Get Excel for a group             |
| PATCH  | `/visits/group/:groupId/date`      | Admin | Change date for all in group      |
| PATCH  | `/visits/group/:groupId/konsulent` | Admin | Change konsulent for all in group |
| PATCH  | `/visits/:id/group`                | Admin | Move visit to different group     |

### Grouping Rules in Frontend

- Visits with `group_id === null` or `group_id === 0` go to "Andre besøg" section
- Groups are sorted by `visit_date` (ascending)
- Within each group, visits are sorted by `stop_nr`

## DataTable Selection Patterns

The DataTable component (`src/components/DataTable.vue`) emits two different selection events:

1. `@selection-changed` - Emits **array indices** (legacy behavior)
2. `@selection-ids-changed` - Emits **actual IDs** directly

**Always use `@selection-ids-changed`** for components that need to make API calls with visit IDs. Using `selection-changed` can cause index-to-ID mapping issues when:

- Data is filtered
- Data is paginated
- Data is sorted

### Multiple Tables with Shared Selection

When using multiple DataTables (e.g., grouped visits), use `v-model` for shared selection state:

```vue
<DataTable
  v-for="group in groupedVisits"
  :key="group.key"
  :data="group.visits"
  v-model="selectedVisitIds"
  ...
/>
```

This requires DataTable to support `modelValue` prop and emit `update:modelValue`.

## Bootstrap Modals with Teleport

When using Bootstrap with Vue, modals work best when teleported to body:

```vue
<Teleport to="body">
  <div v-if="showModal">
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show" tabindex="-1" style="display: block" role="dialog">
      <div class="modal-dialog">
        <div class="modal-content">
          <!-- modal content -->
        </div>
      </div>
    </div>
  </div>
</Teleport>
```

**Important**: Use `v-show` instead of `v-if` on the inner div if the modal needs to conditionally re-render, or use `v-if` on a wrapper div that won't be affected by scoped styles.

## Download Excel/Blob Files

For endpoints that return binary files (Excel):

```js
async function downloadGroupExcel(groupId) {
  const response = await api.get(`/visits/group/${groupId}/planned`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `filename.xlsx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
```

## Components Using Each Pattern

| Component            | Event                    | Status     |
| -------------------- | ------------------------ | ---------- |
| NonPlannedVisits.vue | `@selection-ids-changed` | ✅ Correct |
| NotVisitedVisits.vue | `@selection-ids-changed` | ✅ Correct |
| ReviewVisits.vue     | `@selection-ids-changed` | ✅ Correct |
| PlannedVisits.vue    | `@selection-ids-changed` | ✅ Correct |
| ArchiveVisits.vue    | `@selection-ids-changed` | ✅ Correct |

## Correct Selection Handler Pattern

```js
const handleSelectionChange = (selectedIds) => {
  selectedVisits.value = selectedIds
}
```

## Visit Status IDs

| Status ID | Meaning                                   | Frontend Tab     |
| --------- | ----------------------------------------- | ---------------- |
| 1         | Created (not planned)                     | NonPlannedVisits |
| 2         | Planned                                   | PlannedVisits    |
| 3         | Not visited (letter sent but not visited) | NotVisitedVisits |
| 4         | Reviewed (visited, awaiting review)       | ReviewVisits     |
| 5         | Completed (reviewed)                      | ArchiveVisits    |

## API Endpoints

### Visit Endpoints (Frontend → Backend)

| Method | Endpoint                           | Auth  | Description                        |
| ------ | ---------------------------------- | ----- | ---------------------------------- |
| GET    | `/visits/create`                   | Admin | Get created (unplanned) visits     |
| GET    | `/visits/planned`                  | Admin | Get planned visits grouped by user |
| GET    | `/visits/byStatus?status=X`        | Admin | Get visits by status ID            |
| GET    | `/visits/byId?id=X`                | User  | Get single visit by ID             |
| POST   | `/visits/create`                   | Admin | Create new visits                  |
| POST   | `/visits/plan`                     | Admin | Upload Excel to plan visits        |
| POST   | `/visits/visitfile`                | Admin | Generate Excel for planning        |
| PATCH  | `/visits/planned/:id`              | Admin | Update planned visit               |
| DELETE | `/visit/byId?id=X`                 | Admin | Delete visit                       |
| POST   | `/visit/letterSent?id=X`           | Admin | Mark visit as sent (status 3)      |
| POST   | `/visit/reviewed`                  | Admin | Move visits to status 5            |
| GET    | `/visit/pdf?id=X`                  | Admin | Get PDF for visit                  |
| GET    | `/visits/group/:groupId/planned`   | Admin | Get Excel for group                |
| PATCH  | `/visits/group/:groupId/date`      | Admin | Change date for all in group       |
| PATCH  | `/visits/group/:groupId/konsulent` | Admin | Change konsulent                   |
| PATCH  | `/visits/:id/group`                | Admin | Move visit to different group      |

### Other Endpoints

| Method | Endpoint                 | Auth   | Description           |
| ------ | ------------------------ | ------ | --------------------- |
| GET    | `/users`                 | Admin  | Get all users         |
| GET    | `/visits/types`          | Public | Get visit types       |
| POST   | `/login`                 | Public | User login            |
| POST   | `/visit-response/create` | User   | Create visit response |

## Data Models (Backend)

### Visit Model (key fields)

```go
type Visit struct {
    ID            uint         // Primary key - USE THIS for API calls
    UserID        uint         // Assigned consultant
    Address       string       // Full address
    Sagsnr        uint         // Case number
    Stopnr        uint         // Stop order in route
    VisitDate     time.Time    // Planned date
    VisitTime     string       // Arrival time
    VisitInterval string       // Time window
    StatusID      uint         // 1-5 (see above)
    TypeID        uint         // Visit type
    GroupId       *uint        // Group ID for coordinated planning (nil/0 = ungrouped)
    Debitors      []Debitor    // Many2many relation
    VisitResponse *VisitResponse // If visited
}
```

### Important: ID vs Sagsnr

- `ID` = Primary key in database, used for ALL API operations
- `Sagsnr` = Case number from external system (Advopro)

## Required Headers

- Authentication: `Authorization: Bearer <token>`
- Content-Type: `application/json` (or `multipart/form-data` for file uploads)

## DataTable Selection Programmatic Control

The DataTable component does NOT support v-model for selections - selections are managed internally via refs. To clear selections programmatically:

1. Add a `ref` to the DataTable in the parent component
2. Add a `clearSelection` method to DataTable.vue and expose it via `defineExpose`
3. Call `dataTableRef.value.clearSelection()` from the parent

```js
// DataTable.vue
const clearSelection = () => {
  selectedItems.value = []
  selectedVisitIds.value = []
}

defineExpose({
  clearSelection,
})

// Parent component
const dataTableRef = ref(null)
// After some action:
dataTableRef.value?.clearSelection()
```

## Standard Mass Action Pattern

Components with bulk operations (send letter, delete, etc.) follow this pattern:

```js
// Parent component
const selectedVisitIds = ref([])
const dataTableRef = ref(null)

const handleSelectionChange = (selectedIds) => {
  selectedVisitIds.value = selectedIds
}

async function handleSendLetter() {
  if (!selectedVisitIds.value.length) return

  try {
    const ops = selectedVisitIds.value.map((id) =>
      api.post('/visit/letterSent', null, { params: { id } }),
    )
    await Promise.allSettled(ops)

    selectedVisitIds.value = []
    dataTableRef.value?.clearSelection()
    // Refresh data...
  } catch (err) {
    console.error('Error sending letters:', err)
  }
}
```

Components with this pattern:

- **PlannedVisits.vue**: Mass send letter, Mass delete
- **NotVisitedVisits.vue**: Mass delete
- **NonPlannedVisits.vue**: Mass delete, Plan selected
- **ReviewVisits.vue**: Mass move to status 5, Mass download PDF

## User Management

### User Model

```go
type User struct {
    gorm.Model
    Initials string     `json:"initials" gorm:"not null"`
    Name     string     `json:"name" binding:"required" gorm:"not null;uniqueIndex:ux_users_name_active,where:deleted_at IS NULL"`
    Username string     `json:"username" binding:"required" gorm:"not null;uniqueIndex:ux_users_username_active,where:deleted_at IS NULL"`
    Password string     `json:"password" binding:"required" gorm:"not null"`
    Rights   UserRights `json:"rights" gorm:"default:user"`
    Email    string     `json:"email"`
    Phone    string     `json:"phone"`
}
```

### User API Endpoints

| Method | Endpoint              | Auth       | Description        |
| ------ | --------------------- | ---------- | ------------------ |
| GET    | `/users`              | Admin      | Get all users      |
| POST   | `/register`           | Admin      | Create new user    |
| PATCH  | `/users/:id`          | User/Admin | Update user fields |
| PATCH  | `/users/:id/password` | User       | Change password    |
| DELETE | `/users/:id`          | Developer  | Delete user        |

### PATCH /users/:id Fields

The patch endpoint accepts these JSON fields:

| Field    | Required | Notes                |
| -------- | -------- | -------------------- |
| username | Yes      |                      |
| name     | Yes      |                      |
| initials | Yes      |                      |
| email    | No       | Send `null` to clear |
| phone    | No       | Send `null` to clear |
| rights   | No       | Developer only       |

### Frontend Components

| Component       | Description                    |
| --------------- | ------------------------------ |
| CreateUser.vue  | Create new user with Bootstrap |
| UpdateUser.vue  | Edit existing users            |
| ProfileView.vue | User profile + password change |
