import { useState, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { motion } from 'framer-motion';

interface Package {
    id: string;
    name: string;
    description: string;
    topicCount: number;
    difficulty: string;
}

interface PackageSelectorProps {
    gameId: string;
    selectedPackages: string[];
    onSelectionChange: (packageIds: string[]) => void;
}

export function PackageSelector({ gameId, selectedPackages, onSelectionChange }: PackageSelectorProps) {
    const [packages, setPackages] = useState<Package[]>([]);
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.emit('getAvailablePackages', gameId, (pkgs: Package[]) => {
            setPackages(pkgs);
        });
    }, [socket, gameId]);

    const togglePackage = (id: string) => {
        const newSelection = selectedPackages.includes(id)
            ? selectedPackages.filter(p => p !== id)
            : [...selectedPackages, id];

        // Don't allow deselecting all packages
        if (newSelection.length > 0) {
            onSelectionChange(newSelection);
        }
    };

    const totalTopics = packages
        .filter(p => selectedPackages.includes(p.id))
        .reduce((sum, p) => sum + p.topicCount, 0);

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
            <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '12px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                Select Topic Categories
            </h3>
            <p style={{
                fontSize: '14px',
                color: '#9ca3af',
                marginBottom: '16px'
            }}>
                {totalTopics} topics selected
            </p>

            <div style={{
                display: 'grid',
                gap: '12px'
            }}>
                {packages.map(pkg => (
                    <motion.label
                        key={pkg.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px',
                            background: selectedPackages.includes(pkg.id)
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))'
                                : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            border: selectedPackages.includes(pkg.id)
                                ? '2px solid #6366f1'
                                : '2px solid transparent',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selectedPackages.includes(pkg.id)}
                            onChange={() => togglePackage(pkg.id)}
                            style={{
                                width: '20px',
                                height: '20px',
                                marginRight: '12px',
                                cursor: 'pointer',
                                accentColor: '#6366f1'
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontWeight: '600',
                                fontSize: '16px',
                                marginBottom: '4px'
                            }}>
                                {pkg.name}
                            </div>
                            <div style={{
                                fontSize: '13px',
                                color: '#9ca3af'
                            }}>
                                {pkg.description} • {pkg.topicCount} topics
                            </div>
                        </div>
                        <div style={{
                            fontSize: '12px',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            background: pkg.difficulty === 'easy'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : pkg.difficulty === 'hard'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : 'rgba(251, 191, 36, 0.2)',
                            color: pkg.difficulty === 'easy'
                                ? '#22c55e'
                                : pkg.difficulty === 'hard'
                                    ? '#ef4444'
                                    : '#fbbf24'
                        }}>
                            {pkg.difficulty}
                        </div>
                    </motion.label>
                ))}
            </div>

            {selectedPackages.length === 0 && (
                <p style={{
                    marginTop: '12px',
                    fontSize: '14px',
                    color: '#ef4444',
                    textAlign: 'center'
                }}>
                    ⚠️ Select at least one category
                </p>
            )}
        </div>
    );
}
