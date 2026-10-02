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
        'Buongiorno, abbiamo visto il suo profilo e vorremmo capire meglio esperienza e zona di lavoro.',
        'Buongiorno, la zona e gli orari ci sembrano adatti. È ancora disponibile?',
        'Buongiorno, cerchiamo una figura per assistenza diurna. Ha disponibilità nei giorni feriali?',
        'Buongiorno, potremmo avere bisogno anche di copertura nei weekend. È disponibile?',
        'Grazie per la disponibilità. Possiamo fissare un primo colloquio telefonico?',
        'Buongiorno, sarebbe disponibile per un breve incontro conoscitivo nei prossimi giorni?',
        'Buongiorno, ho letto la sua candidatura. Quando sarebbe disponibile per un incontro?',
        'Grazie del messaggio. Le farò sapere a breve dopo aver confrontato le candidature.',
        'Buongiorno, ricontatto per sapere se ha ancora disponibilità per la nostra richiesta.',
        'Grazie della risposta. Possiamo procedere con i dettagli su orari e mansioni?',
        'Grazie, per ora non abbiamo bisogno. La ricontatteremo se la situazione cambia.',
        'Grazie per la disponibilità. Abbiamo scelto un’altra candidatura, le auguriamo buon lavoro.',
    ];

    /** @var list<string> */
    public const PROFESSIONAL = [
        'Buongiorno, grazie per avermi contattato. Sono disponibile e posso condividere referenze.',
        'Buongiorno, ho visto la richiesta. Ho esperienza in questo tipo di assistenza: posso aiutarvi?',
        'Grazie del messaggio. Sono disponibile per un breve colloquio per capire meglio le esigenze.',
        'Buongiorno, sono disponibile nelle prossime settimane. Dimmi pure orari e zona preferiti.',
        'Grazie per l’interesse. Posso condividere un riepilogo di esperienza e disponibilità.',
        'Buongiorno, ho esperienza con assistenza a domicilio e supporto quotidiano. Posso rispondere alle vostre domande.',
        'Buongiorno, lavoro da anni in questo ambito e posso fornire referenze recenti su richiesta.',
        'Buongiorno, propongo un breve colloquio telefonico per capire meglio le esigenze.',
        'Grazie, sono disponibile per un incontro conoscitivo. Indicatemi giorno e fascia oraria.',
        'Grazie, ho ricevuto la vostra richiesta. Posso iniziare dalla data indicata.',
        'Perfetto, confermo la disponibilità per gli orari discussi. Resto in attesa di indicazioni.',
        'Buongiorno, al momento non sono disponibile in quella zona o orario. Resto a disposizione per il futuro.',
        'Grazie del contatto. In questo periodo non posso accettare nuove richieste, ma vi ringrazio.',
        'Buongiorno, ricontatto per sapere se avete ancora bisogno di assistenza e se posso esservi utile.',
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
