# Sort It! Mobile Gallery App

A React Native mobile application for organizing photos with intuitive swipe gestures. Built with Expo and TypeScript.

## Features

- **Photo Gallery**: View all your photos in a responsive grid layout
- **Album Management**: Organize photos into albums with automatic detection of system albums (Camera, Downloads, Instagram, etc.)
- **Swipe Gestures**: Intuitive swipe-based photo organization
- **Permission Management**: Comprehensive Android permission handling
- **Performance Optimized**: Efficient photo loading with caching and virtualization
- **Settings**: Customizable grid columns, thumbnail quality, and gesture configuration

## Screenshots

The app includes:
- Gallery view with photo grid
- Albums view showing photo counts
- Settings with various customization options
- Permission management screens

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Zustand** for state management
- **Expo MediaLibrary** for photo access
- **React Navigation** for navigation
- **Jest** for testing

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── services/          # Business logic and API services
├── store/             # State management
├── types/             # TypeScript type definitions
└── constants/         # App constants
```

## Key Components

- **MobileGalleryGrid**: Optimized photo grid with virtualization
- **AndroidPhotoService**: Photo loading and management
- **AndroidPermissionService**: Permission handling
- **PermissionOnboardingFlow**: User-friendly permission requests

## Installation

1. Clone the repository:
```bash
git clone https://github.com/BabuMohit/Sort-It-.git
cd Sort-It-/sort-it-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on Android:
```bash
npx expo run:android
```

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npx expo build:android
```

## Permissions

The app requires the following Android permissions:
- `READ_EXTERNAL_STORAGE` - To read photos from device storage
- `WRITE_EXTERNAL_STORAGE` - To organize and move photos
- `ACCESS_MEDIA_LOCATION` - To access photo location data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Author

Built with ❤️ for efficient photo organization