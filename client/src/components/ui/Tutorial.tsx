import { useState, useEffect, useMemo, useRef } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { api } from '../../services/api';

interface TutorialProps {
  run?: boolean;
  onFinish?: () => void;
}

export function Tutorial({ run: initialRun, onFinish }: TutorialProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [key, setKey] = useState(Date.now());
  const processingRef = useRef(false);

  // Determine which tutorial to show based on location
  const currentPageType = useMemo(() => {
    const path = location.pathname;
    if (path === '/collection') return 'collection';
    if (path === '/wishlist') return 'wishlist';
    if (path === '/explore') return 'explore';
    if (path === '/trade') return 'trade';
    if (path.startsWith('/trade/')) return 'trade_session';
    return null;
  }, [location.pathname]);

  // Determine which tutorial should actually run
  const tutorialType = useMemo(() => {
    if (!user) return null;
    
    // 1. Check if onboarding is needed
    if (!user.tutorialProgress?.onboarding) {
      return 'onboarding';
    }
    
    // 2. Otherwise check current page
    if (currentPageType && !user.tutorialProgress?.[currentPageType]) {
      return currentPageType;
    }
    
    return null;
  }, [user?.tutorialProgress, currentPageType]);

  useEffect(() => {
    if (!user) {
      setRun(false);
      return;
    }

    if (tutorialType) {
      // Small delay to ensure any previous Joyride instance is fully unmounted/cleaned up
      const timer = setTimeout(() => {
        setRun(true);
        setKey(Date.now());
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setRun(false);
    }
  }, [tutorialType, user?.id]);

  // Handle explicit run from initialRun prop (used for Replay)
  useEffect(() => {
    if (initialRun) {
      setRun(true);
      setKey(Date.now());
    }
  }, [initialRun]);

  const rawSteps = useMemo<Step[]>(() => {
    const onboardingSteps: Step[] = [
      {
        target: 'body',
        placement: 'center',
        content: (
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>{t('tutorial.welcome.title', 'Welcome to MTG Binder!')}</h3>
            <p>{t('tutorial.welcome.content', 'Let us show you around the main features of the app.')}</p>
          </div>
        ),
        disableBeacon: true,
      },
      {
        target: '#nav-collection',
        content: t('tutorial.nav.collection', 'This is your collection. Here you can manage all the cards you own.'),
      },
      {
        target: '#nav-wishlist',
        content: t('tutorial.nav.wishlist', 'Keep track of the cards you want to acquire in your wishlist.'),
      },
      {
        target: '#nav-explore',
        content: t('tutorial.nav.explore', "Explore other users' public binders and find potential trades."),
      },
      {
        target: '#nav-trade',
        content: t('tutorial.nav.trade', 'The Trade center. Start real-time trading sessions with other users.'),
      },
      {
        target: '#user-menu-button',
        content: t('tutorial.nav.settings', 'Here you can change your avatar and more. You can also replay this tutorial anytime!'),
      },
    ];

    const collectionSteps: Step[] = [
      {
        target: 'body',
        placement: 'center',
        content: (
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>{t('nav.collection', 'Collection')}</h3>
            <p>{t('tutorial.collection.welcome', 'In the Collection page, you manage your inventory. You can see stats like total value and unique cards.')}</p>
          </div>
        ),
        disableBeacon: true,
      },
      {
        target: '#add-card-button',
        content: t('tutorial.collection.addCard', 'Click here to add new cards to your collection manually.'),
      },
      {
        target: '#import-csv-button',
        content: t('tutorial.collection.import', 'Or you can bulk import your collection from a CSV file from other popular apps.'),
      },
    ];

    const wishlistSteps: Step[] = [
      {
        target: 'body',
        placement: 'center',
        content: (
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>{t('nav.wishlist', 'Wishlist')}</h3>
            <p>{t('tutorial.wishlist.welcome', 'In the wishlist, you can add cards you are looking for. We will use this to find trade matches!')}</p>
          </div>
        ),
        disableBeacon: true,
      },
      {
        target: '#wishlist-search',
        content: t('tutorial.wishlist.search', 'Search through your desired cards by name or set.'),
      },
      {
        target: '#wishlist-priority-filter',
        content: t('tutorial.wishlist.priority', 'Filter by priority to focus on what you need most.'),
      },
      {
        target: '#wishlist-import-decklist',
        content: t('tutorial.wishlist.importDecklist', 'You can also paste a decklist to quickly add multiple cards to your wishlist.'),
      },
      {
        target: '#wishlist-add-button',
        content: t('tutorial.wishlist.addCard', 'Manually search and add specific printings of cards you want.'),
      },
    ];

    const exploreSteps: Step[] = [
      {
        target: 'body',
        placement: 'center',
        content: (
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>{t('nav.explore', 'Explore')}</h3>
            <p>{t('tutorial.explore.welcome', 'Explore public binders from other collectors around the world.')}</p>
          </div>
        ),
        disableBeacon: true,
      },
      {
        target: '#explore-search',
        content: t('tutorial.explore.search', 'Search for specific users by their display name.'),
      },
      {
        target: '#explore-user-card-0',
        content: t('tutorial.explore.userCard', 'Click on a user to view their full trade binder. You can see their cards and values without an account!'),
      },
    ];

    const tradeSteps: Step[] = [
      {
        target: 'body',
        placement: 'center',
        content: (
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>{t('nav.trade', 'Trade')}</h3>
            <p>{t('tutorial.trade.welcome', 'The trade center is where the magic happens. You can start or join live trading sessions.')}</p>
          </div>
        ),
        disableBeacon: true,
      },
      {
        target: '#trade-create-session',
        content: t('tutorial.trade.create', 'Create a new session to generate a unique code and QR. Share them with your trade partner!'),
      },
      {
        target: '#trade-join-scan',
        content: t('tutorial.trade.joinScan', 'If your partner already created a session, just scan their QR code to join instantly.'),
      },
      {
        target: '#trade-join-input',
        content: t('tutorial.trade.joinInput', 'Or manually enter the 6-character session code they provided.'),
      },
    ];

    const tradeSessionSteps: Step[] = [
      {
        target: 'body',
        placement: 'center',
        content: (
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>{t('trade.activeSession', 'Active Trade')}</h3>
            <p>{t('tutorial.trade.welcome', 'The trade session is real-time. Both of you can select cards and chat.')}</p>
          </div>
        ),
        disableBeacon: true,
      },
      {
        target: '#trade-session-balance',
        content: t('tutorial.session.balance', 'This shows the value balance of the trade. It helps you ensure the trade is fair!'),
      },
      {
        target: '#trade-session-partner-offers',
        content: t('tutorial.session.partnerOffers', "These are the cards your partner has that match your wishlist. Click on them to add them to the trade."),
      },
      {
        target: '#trade-session-chat',
        content: t('tutorial.session.chat', 'You can chat with your partner in real-time while you negotiate.'),
      },
      {
        target: '#trade-session-my-offers',
        content: t('tutorial.session.myOffers', 'Click here to see which of your cards match your partner\'s wishlist.'),
      },
      {
        target: '#trade-session-accept',
        content: t('tutorial.session.accept', 'Once you are happy with the selection, click Accept.'),
      },
      {
        target: '#trade-session-complete',
        content: t('tutorial.session.complete', 'When both users have accepted, the initiator can complete the trade to move the cards between collections!'),
      },
    ];

    switch (tutorialType) {
      case 'onboarding': return onboardingSteps;
      case 'collection': return collectionSteps;
      case 'wishlist': return wishlistSteps;
      case 'explore': return exploreSteps;
      case 'trade': return tradeSteps;
      case 'trade_session': return tradeSessionSteps;
      default: return [];
    }
  }, [tutorialType, t]);

  // Manually add localized progress to each step
  const steps = useMemo(() => {
    return rawSteps.map((step, index) => ({
      ...step,
      locale: {
        next: `${t('common.next')} (${t('common.step')} ${index + 1} ${t('common.of')} ${rawSteps.length})`,
        last: t('common.last'),
      },
    }));
  }, [rawSteps, t]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) && tutorialType && !processingRef.current) {
      processingRef.current = true;
      setRun(false);
      
      // Update user setting if not already seen for this type
      if (user && !user.tutorialProgress?.[tutorialType]) {
        try {
          const newProgress = { ...user.tutorialProgress, [tutorialType]: true };
          const response = await api.put('/auth/me', { tutorialProgress: newProgress });
          if (response.data.data) {
            updateUser(response.data.data);
          }
        } catch (error) {
          console.error('Failed to update tutorial status', error);
        } finally {
          processingRef.current = false;
        }
      } else {
        processingRef.current = false;
      }
      
      if (onFinish) {
        onFinish();
      }
    }
  };

  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Joyride
      key={key}
      steps={steps}
      run={run}
      continuous={true}
      showProgress={false} // We handle progress manually in the button text now
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: theme.palette.primary.main,
          zIndex: 10000,
          backgroundColor: isDarkMode ? '#121212' : '#fff',
          textColor: isDarkMode ? '#fff' : '#333',
          arrowColor: isDarkMode ? '#121212' : '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.75)',
        },
        tooltip: {
          borderRadius: '8px',
          padding: '15px',
        },
        buttonNext: {
          borderRadius: '4px',
          backgroundColor: theme.palette.primary.main,
          color: '#fff',
        },
        buttonBack: {
          marginRight: '8px',
          color: isDarkMode ? '#aaa' : '#666',
        },
        buttonSkip: {
          color: isDarkMode ? '#aaa' : '#666',
        }
      }}
      locale={{
        back: t('common.back', 'Back'),
        close: t('common.close', 'Close'),
        last: t('common.last', 'Finish'),
        next: t('common.next', 'Next'), // Explicitly provide translated Next for global default
        skip: t('common.skip', 'Skip'),
      }}
    />
  );
}
