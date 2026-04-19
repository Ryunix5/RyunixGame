import { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../SocketContext';

interface Package {
    id: string;
    name: string;
    description: string;
    topicCount: number;
    difficulty: string;
}

interface PackageSelectorProps {
    selectedPackageId: string;
    onSelectionChange: (packageId: string) => void;
}

export function PackageSelector({ selectedPackageId, onSelectionChange }: PackageSelectorProps) {
    const [packages, setPackages] = useState<Package[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.emit('getAvailablePackages', (pkgs: Package[]) => {
            setPackages(pkgs);
        });
    }, [socket]);

    const filteredPackages = useMemo(() => {
        const lowerSearch = searchQuery.toLowerCase();
        return packages.filter(pkg => 
            pkg.name.toLowerCase().includes(lowerSearch) || 
            pkg.description.toLowerCase().includes(lowerSearch)
        );
    }, [packages, searchQuery]);

    const selectedPackage = packages.find(p => p.id === selectedPackageId);

    return (
        <div className="w-full h-full flex flex-col font-pixel text-slate-300">
            <h3 className="text-xl font-bold text-[#ff007f] mb-2 uppercase tracking-widest border-b-2 border-slate-800 pb-2">
                &gt; CONTENT_PACKAGES
            </h3>
            
            <input
                type="text"
                placeholder="SEARCH_INDEX..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border-2 border-slate-800 text-[#00e5ff] px-4 py-2 mb-4 focus:outline-none focus:border-[#ff007f] font-sans font-bold uppercase transition-colors"
            />

            <div className="flex-1 overflow-y-auto max-h-48 custom-scrollbar border-2 border-slate-900 bg-[#0a0a0a] p-2 space-y-2 relative">
                {filteredPackages.length === 0 ? (
                    <div className="p-4 text-center text-slate-600 animate-pulse">404: ARCHIVE_EMPTY</div>
                ) : (
                    filteredPackages.map(pkg => {
                        const isSelected = selectedPackageId === pkg.id;
                        return (
                            <label
                                key={pkg.id}
                                className={`
                                    flex items-center p-3 cursor-pointer border-2 transition-all duration-75 relative
                                    ${isSelected 
                                        ? 'border-[#00e5ff] bg-slate-900' 
                                        : 'border-slate-800 hover:bg-black hover:border-slate-600'}
                                `}
                            >
                                <input
                                    type="radio"
                                    name="package"
                                    checked={isSelected}
                                    onChange={() => onSelectionChange(pkg.id)}
                                    className="hidden"
                                />
                                {isSelected && (
                                    <div className="absolute top-0 left-0 w-2 h-full bg-[#00e5ff]" />
                                )}
                                <div className={`flex-1 ${isSelected ? 'ml-3' : 'ml-1'}`}>
                                    <div className={`text-lg uppercase ${isSelected ? 'text-[#00e5ff]' : 'text-slate-400'}`}>
                                        {pkg.name}
                                    </div>
                                    <div className="text-sm font-sans font-bold text-slate-500">
                                        {pkg.description} • {pkg.topicCount} TOPICS
                                    </div>
                                </div>
                            </label>
                        );
                    })
                )}
            </div>
            
            {/* Display Selected Status */}
            <div className="mt-4 p-2 border-t-2 border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>ACTIVE_ARCHIVE:</span>
                <span className="text-white bg-slate-900 px-2 py-1 border border-slate-700">
                    {selectedPackage ? selectedPackage.name : 'NONE'}
                </span>
            </div>
        </div>
    );
}
