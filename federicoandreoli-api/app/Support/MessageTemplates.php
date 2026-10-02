<?php

namespace App\Support;

/**
 * Messaggi di sistema ammessi — solo template moderati (niente testo libero).
 */
final class MessageTemplates
{
    /** @var list<string> */
    public const FAMILY = [
        'Buongiorno, sono interessato/a al suo profilo. Vorrei sapere se è disponibile nelle prossime settimane.',
        'Buongiorno, cerchiamo assistenza per un familiare. Può indicarmi disponibilità e tariffe?',
        'Grazie per la disponibilità. Possiamo fissare un primo colloquio telefonico?',
        'Buongiorno, ho letto la sua candidatura. Quando sarebbe disponibile per un incontro?',
        'Grazie del messaggio. Le farò sapere a breve dopo aver confrontato le candidature.',
        'Buongiorno, la zona e gli orari ci sembrano adatti. È ancora disponibile?',
        'Grazie, per ora non abbiamo bisogno. La ricontatteremo se la situazione cambia.',
    ];

    /** @var list<string> */
    public const PROFESSIONAL = [
        'Buongiorno, grazie per avermi contattato. Sono disponibile e posso condividere referenze.',
        'Buongiorno, ho visto la richiesta. Ho esperienza in questo tipo di assistenza: posso aiutarvi?',
        'Grazie del messaggio. Sono disponibile per un breve colloquio per capire meglio le esigenze.',
        'Buongiorno, propongo un breve colloquio telefonico per capire meglio le esigenze.',
        'Grazie, ho ricevuto la vostra richiesta. Posso iniziare dalla data indicata.',
        'Buongiorno, al momento non sono disponibile in quella zona o orario. Resto a disposizione per il futuro.',
        'Grazie per l’interesse. Posso condividere un riepilogo di esperienza e disponibilità.',
    ];

    /**
     * @return list<string>
     */
    public static function forMessagingRole(string $role): array
    {
        return $role === 'family' ? self::FAMILY : self::PROFESSIONAL;
    }

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return array_values(array_unique([...self::FAMILY, ...self::PROFESSIONAL]));
    }

    public static function isAllowed(string $body, ?string $messagingRole = null): bool
    {
        $normalized = trim($body);
        if ($normalized === '') {
            return false;
        }

        $pool = $messagingRole === null
            ? self::all()
            : self::forMessagingRole($messagingRole);

        return in_array($normalized, $pool, true);
    }

    public static function defaultFamilyContact(): string
    {
        return self::FAMILY[0];
    }
}
