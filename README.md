
## 📁 Cấu Trúc Thư Mục

```
src/
├── app/                    # App configuration
│   ├── guards.tsx         # Route guards
│   ├── providers.tsx      # Root providers
│   ├── router.tsx         # Route definitions
│   ├── stores/            # Zustand stores
│   └── providers/         # Custom providers
│
├── features/              # Feature modules
│   ├── auth/             # Authentication feature
│   └── home/             # Home feature
│
├── lib/                  # External library configs
│   ├── axios.ts         # Axios instance
│   ├── query-client.ts  # React Query config
│   ├── query-keys.ts    # Query key factory
│   └── sentry.ts        # Sentry setup
│
├── shared/              # Shared utilities
│   ├── components/      # Reusable components
│   ├── constants/       # Global constants
│   ├── hooks/          # Reusable hooks
│   ├── types/          # Shared types
│   └── utils/          # Utility functions
│
└── config/             # App configuration
    ├── index.ts       # Main config
    └── ui.config.ts   # UI theme config
```


### 1. Tạo cấu trúc feature

```
src/features/[feature-name]/
├── components/
├── hooks/
├── pages/
├── services/
└── types.ts
```

### 2. Define types

```typescript
// types.ts
export interface Entity {
  id: string;
  name: string;
}
```

### 3. Tạo API service

```typescript
// services/api.service.ts
import { axios } from '@/lib/axios';

export const apiService = {
  fetchData: async () => {
    const { data } = await axios.get('/endpoint');
    return data;
  },
};
```

### 4. Tạo custom hook

```typescript
// hooks/useFeatureData.ts
import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/lib/query-keys';
import { apiService } from '../services/api.service';

export const useFeatureData = () => {
  return useQuery({
    queryKey: QueryKeys.feature.list(),
    queryFn: () => apiService.fetchData(),
  });
};
```

### 5. Tạo component/page

```typescript
// pages/FeaturePage.tsx
import { type FC } from 'react';
import { useFeatureData } from '../hooks/useFeatureData';

const FeaturePage: FC = () => {
  const { data, isLoading } = useFeatureData();

  if (isLoading) return <div>Loading...</div>;

  return <div>{/* Your UI */}</div>;
};

export default FeaturePage;
```

### 6. Thêm route

```typescript
// app/router.tsx
const FeaturePage = lazy(() => import('@/features/feature/pages/FeaturePage'));

// Add to router config
{
  path: '/feature',
  element: (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <FeaturePage />
      </Suspense>
    </ProtectedRoute>
  ),
}
```



## 🧩 shadcn/ui Components

Sử dụng pre-built components từ shadcn/ui:

```tsx
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button>Click me</Button>
  </CardContent>
</Card>;
```

**Components đã cài đặt:**
- Button
- Input
- Label
- Card

Xem thêm tại [docs/SHADCN_GUIDE.md](./docs/SHADCN_GUIDE.md)

## 🔐 Authentication

Sử dụng Zustand store cho auth state:

```typescript
import { useAuthStore } from '@/app/stores/auth.store';

// Get auth state
const { user, isAuthenticated } = useAuthStore();

// Login
const setAuth = useAuthStore((state) => state.setAuth);
setAuth(user, token);

// Logout
const clearAuth = useAuthStore((state) => state.clearAuth);
clearAuth();
```

## 🌐 API Calls

Sử dụng React Query cho data fetching:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: () => apiService.fetchData(),
});

// Mutation
const { mutate } = useMutation({
  mutationFn: (data) => apiService.createData(data),
  onSuccess: () => {
    // Handle success
  },
});
```

## 🎯 Best Practices

### ✅ Do's

- Giữ features độc lập và tự chứa
- Sử dụng React Query cho server state
- Sử dụng Zustand cho client state
- Define types ở feature level
- Sử dụng custom hooks để encapsulate logic
- Sử dụng Tailwind classes thay vì inline styles

### ❌ Don'ts

- Không mix business logic trong components
- Không import trực tiếp từ sibling features
- Không sử dụng `any` type
- Không quên handle loading/error states
- Không tạo components quá lớn

## 📦 Build & Deploy

### Build production

```bash
npm run build
```

Output sẽ được tạo trong thư mục `dist/`.


```
