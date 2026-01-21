    // Get available content packages for a game
    socket.on('getAvailablePackages', (gameId: string, callback) => {
        try {
            const packages = packageLoader.loadPackages(gameId);
            const summary = packages.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                difficulty: p.difficulty || 'medium',
                topicCount: p.topics?.length || 0
            }));
            callback(summary);
        } catch (error) {
            console.error('[getAvailablePackages] Error:', error);
            callback([]);
        }
    });


